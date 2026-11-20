import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import {
  safeFileName,
  type ExportedFile,
} from '../../../shared/excel/workbook.util.js';
import { AcademicFacade } from '../../academic/facades/academic.facade.js';
import { ContentFacade } from '../../content/facades/content.facade.js';
import type { AssignmentSubmission } from '../entities/assignment-submission.entity.js';
import { AssignmentRepository } from '../repositories/assignment.repository.js';
import { SubmissionRepository } from '../repositories/submission.repository.js';
import {
  buildAssignmentWorkbook,
  type AssignmentExportRow,
} from '../utils/assignment-export.builder.js';

/** Shown for a submission whose student has left the class, so their grade is not silently dropped. */
const FORMER_STUDENT_NOTE = '(không còn trong lớp)';

/** Builds the Excel result sheet of one assignment for the class lecturer. */
@Injectable()
export class AssignmentExportService {
  constructor(
    private readonly assignmentRepository: AssignmentRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly academicFacade: AcademicFacade,
    private readonly contentFacade: ContentFacade,
  ) {}

  /**
   * One row per enrolled student (submitted or not), followed by submissions of students who have
   * since left the class. The user must manage the class and the assignment must belong to it.
   */
  async exportResults(
    classId: string,
    assignmentId: string,
    user: AuthenticatedUser,
  ): Promise<ExportedFile> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const isInClass = await this.contentFacade.isAssignmentInClass(
      classId,
      assignmentId,
    );
    if (!isInClass) throw new NotFoundException('Assignment not found');

    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');

    const [classView, roster, submissions] = await Promise.all([
      this.academicFacade.getClassById(classId),
      this.academicFacade.getClassRoster(classId, user),
      this.submissionRepository.findAllByAssignment(assignmentId),
    ]);
    const fileIdsBySubmission =
      await this.submissionRepository.findFileIdsBySubmissions(
        submissions.map((submission) => submission.id),
      );

    const submissionByStudent = new Map(
      submissions.map((submission) => [submission.submittedBy, submission]),
    );
    const toRow = (
      student: { studentCode: string; fullName: string; email: string },
      submission: AssignmentSubmission | undefined,
    ): AssignmentExportRow => ({
      studentCode: student.studentCode,
      fullName: student.fullName,
      email: student.email,
      status: !submission
        ? 'NOT_SUBMITTED'
        : submission.score === null
          ? 'SUBMITTED'
          : 'GRADED',
      submittedAt: submission?.submittedAt ?? null,
      isLate: submission ? submission.submittedAt > assignment.endAt : false,
      fileCount: submission
        ? (fileIdsBySubmission.get(submission.id)?.length ?? 0)
        : 0,
      // `numeric` columns come back from Postgres as strings.
      score:
        submission && submission.score !== null ? Number(submission.score) : null,
      comment: submission?.comment ?? null,
      gradedAt: submission?.gradedAt ?? null,
    });

    const enrolledIds = new Set(roster.map((student) => student.id));
    const enrolledRows = [...roster]
      .sort((a, b) => a.studentCode.localeCompare(b.studentCode))
      .map((student) => toRow(student, submissionByStudent.get(student.id)));
    const formerRows = submissions
      .filter((submission) => !enrolledIds.has(submission.submittedBy))
      .map((submission) =>
        toRow(
          {
            studentCode: submission.student.studentCode,
            fullName: `${submission.student.user.fullName} ${FORMER_STUDENT_NOTE}`,
            email: submission.student.user.email,
          },
          submission,
        ),
      );

    const buffer = await buildAssignmentWorkbook([...enrolledRows, ...formerRows]);
    return {
      fileName: `${safeFileName(`Ket-qua-${classView.classCode}-${assignment.title}`)}.xlsx`,
      buffer,
    };
  }
}