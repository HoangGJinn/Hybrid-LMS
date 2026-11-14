import { Injectable, NotFoundException } from '@nestjs/common';
import { ZipArchive } from 'archiver';
import type { Response } from 'express';
import type { Readable } from 'node:stream';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { emptyToNull } from '../../../common/utils/string.util.js';
import { FileFacade } from '../../../shared/file/facades/file.facade.js';
import { AcademicFacade } from '../../academic/facades/academic.facade.js';
import { ContentFacade } from '../../content/facades/content.facade.js';
import type { GradeSubmissionDto } from '../dto/grade-submission.dto.js';
import type { AssignmentSubmission } from '../entities/assignment-submission.entity.js';
import type { Assignment } from '../entities/assignment.entity.js';
import type { AssignmentStatus } from '../enums/assignment-status.enum.js';
import type { SubmissionType } from '../enums/submission-type.enum.js';
import { AssignmentRepository } from '../repositories/assignment.repository.js';
import { SubmissionRepository } from '../repositories/submission.repository.js';
import { SubmissionListItemView } from '../types/submission-list-item-view.type.js';
import { computeAssignmentStatus } from '../utils/assignment-status.util.js';

/** An assignment as it appears in a list (no files, no submission). */
export interface AssignmentSummary {
  readonly id: string;
  readonly classId: string;
  readonly title: string;
  readonly instruction: string;
  readonly openAt: Date;
  readonly endAt: Date;
  readonly submissionType: SubmissionType;
  readonly acceptedExtensions: string[];
  readonly submissionNote: string | null;
  readonly status: AssignmentStatus;
}

/** A submission together with its assignment, for the lecturer's grading queue. */
export type QueueItem = SubmissionListItemView & {
  readonly assignment: AssignmentSummary;
};

/** Characters that are not allowed in file or folder names inside a zip. */
const unsafeNameChars = /[\\/:*?"<>|]+/g;
const safeName = (name: string): string =>
  name.replace(unsafeNameChars, '_').trim() || 'untitled';

/** Lists, grading and bulk download of submissions, plus the student's own overview lists. */
@Injectable()
export class SubmissionReviewService {
  constructor(
    private readonly submissionRepository: SubmissionRepository,
    private readonly assignmentRepository: AssignmentRepository,
    private readonly academicFacade: AcademicFacade,
    private readonly contentFacade: ContentFacade,
    private readonly fileFacade: FileFacade,
  ) {}

  /** Assignments of every class the student is enrolled in, with the student's own status. */
  async myAssignments(user: AuthenticatedUser): Promise<AssignmentSummary[]> {
    const classes = await this.academicFacade.getClassesByStudent(user.id);
    const links = await this.contentFacade.findAssignmentsByClasses(
      classes.map((classRoom) => classRoom.id),
    );
    const assignments = await this.assignmentRepository.findByIds(
      links.map((link) => link.assignmentId),
    );
    const mine = await this.submissionRepository.findByStudentInAssignments(
      user.id,
      assignments.map((assignment) => assignment.id),
    );
    const classOf = new Map(
      links.map((link) => [link.assignmentId, link.classId]),
    );
    const now = new Date();
    return assignments.map((assignment) =>
      this.toSummary(
        assignment,
        classOf.get(assignment.id) ?? '',
        computeAssignmentStatus(
          assignment,
          mine.find((s) => s.assignmentId === assignment.id) ?? null,
          now,
        ),
      ),
    );
  }

  /** The student's own submissions across all their classes. */
  async mySubmissions(
    user: AuthenticatedUser,
  ): Promise<SubmissionListItemView[]> {
    const classes = await this.academicFacade.getClassesByStudent(user.id);
    const links = await this.contentFacade.findAssignmentsByClasses(
      classes.map((classRoom) => classRoom.id),
    );
    const rows = await this.submissionRepository.findByStudentInAssignments(
      user.id,
      links.map((link) => link.assignmentId),
    );
    return this.toViews(rows);
  }

  /** Every submission of one assignment of a class the user manages. */
  async list(
    classId: string,
    assignmentId: string,
    user: AuthenticatedUser,
  ): Promise<SubmissionListItemView[]> {
    await this.assertManagesAssignment(classId, assignmentId, user);
    const rows =
      await this.submissionRepository.findAllByAssignment(assignmentId);
    return this.toViews(rows);
  }

  /** Submissions of every given class, each with its assignment: the lecturer's grading queue. */
  async lecturerQueue(
    classIds: string[],
    user: AuthenticatedUser,
  ): Promise<QueueItem[]> {
    for (const classId of classIds) {
      await this.academicFacade.assertCanManageClass(classId, user);
    }
    const links = await this.contentFacade.findAssignmentsByClasses(classIds);
    const assignments = await this.assignmentRepository.findByIds(
      links.map((link) => link.assignmentId),
    );
    const classOf = new Map(
      links.map((link) => [link.assignmentId, link.classId]),
    );
    const assignmentById = new Map(
      assignments.map((assignment) => [assignment.id, assignment]),
    );
    const rows = await this.submissionRepository.findByAssignments(
      assignments.map((assignment) => assignment.id),
    );
    const views = await this.toViews(rows);
    const now = new Date();
    return views.flatMap((view) => {
      const assignment = assignmentById.get(view.assignmentId);
      if (!assignment) return [];
      const status = computeAssignmentStatus(assignment, view, now);
      return [
        Object.assign(view, {
          assignment: this.toSummary(
            assignment,
            classOf.get(assignment.id) ?? '',
            status,
          ),
        }),
      ];
    });
  }

  /** Saves the score and feedback of one submission; grading again simply overwrites the previous grade. */
  async grade(
    classId: string,
    assignmentId: string,
    submissionId: string,
    dto: GradeSubmissionDto,
    user: AuthenticatedUser,
  ): Promise<SubmissionListItemView> {
    await this.assertManagesAssignment(classId, assignmentId, user);
    const submission = await this.submissionRepository.findById(submissionId);
    if (!submission || submission.assignmentId !== assignmentId) {
      throw new NotFoundException('Submission not found');
    }
    await this.submissionRepository.saveGrade(
      submissionId,
      dto.score,
      emptyToNull(dto.comment),
      new Date(),
    );
    const graded = await this.submissionRepository.findById(submissionId);
    if (!graded) throw new NotFoundException('Submission not found');
    const [view] = await this.toViews([graded]);
    return view;
  }

  /**
   * Streams a zip of every submission of the assignment (or just one when `submissionId` is given).
   * One folder per student: `{studentCode}_{name}/`, holding their files and, for online answers, `answer.txt`.
   */
  async streamZip(
    classId: string,
    assignmentId: string,
    submissionId: string | undefined,
    user: AuthenticatedUser,
    response: Response,
  ): Promise<void> {
    await this.assertManagesAssignment(classId, assignmentId, user);
    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');
    const all =
      await this.submissionRepository.findAllByAssignment(assignmentId);
    const rows = submissionId ? all.filter((s) => s.id === submissionId) : all;
    if (rows.length === 0) {
      throw new NotFoundException('No submissions to download');
    }
    const fileIdsBySubmission =
      await this.submissionRepository.findFileIdsBySubmissions(
        rows.map((row) => row.id),
      );

    const zipName = `${safeName(assignment.title)}-submissions.zip`;
    response.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(zipName)}`,
    });
    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on('error', (error) => response.destroy(error));
    archive.pipe(response);

    // Wait for each entry to be written before adding the next, so only one S3 connection is open at a time.
    const addEntry = (source: Readable | string, name: string) =>
      new Promise<void>((resolve, reject) => {
        archive.once('entry', () => resolve());
        if (typeof source !== 'string') source.once('error', reject);
        archive.append(source, { name });
      });

    for (const row of rows) {
      const folder = safeName(
        `${row.student.studentCode}_${row.student.user.fullName}`,
      );
      if (row.answerText) {
        await addEntry(row.answerText, `${folder}/answer.txt`);
      }
      for (const fileId of fileIdsBySubmission.get(row.id) ?? []) {
        const { fileName, stream } =
          await this.fileFacade.openReadStream(fileId);
        await addEntry(stream, `${folder}/${safeName(fileName)}`);
      }
    }
    await archive.finalize();
  }

  /** The user must manage the class, and the assignment must really belong to it. */
  private async assertManagesAssignment(
    classId: string,
    assignmentId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const isInClass = await this.contentFacade.isAssignmentInClass(
      classId,
      assignmentId,
    );
    if (!isInClass) {
      throw new NotFoundException('Assignment not found');
    }
  }

  private toSummary(
    assignment: Assignment,
    classId: string,
    status: AssignmentStatus,
  ): AssignmentSummary {
    return {
      id: assignment.id,
      classId,
      title: assignment.title,
      instruction: assignment.instruction,
      openAt: assignment.openAt,
      endAt: assignment.endAt,
      submissionType: assignment.submissionType,
      acceptedExtensions: assignment.acceptedExtensions,
      submissionNote: assignment.submissionNote,
      status,
    };
  }

  /** Builds the views with two queries in total, however many submissions there are. */
  private async toViews(
    rows: AssignmentSubmission[],
  ): Promise<SubmissionListItemView[]> {
    const fileIdsBySubmission =
      await this.submissionRepository.findFileIdsBySubmissions(
        rows.map((row) => row.id),
      );
    const links = await this.fileFacade.getDownloadLinks(
      [...fileIdsBySubmission.values()].flat(),
    );
    const linkById = new Map(links.map((link) => [link.fileId, link]));
    return rows.map((row) =>
      SubmissionListItemView.from(
        row,
        (fileIdsBySubmission.get(row.id) ?? []).flatMap(
          (fileId) => linkById.get(fileId) ?? [],
        ),
      ),
    );
  }
}