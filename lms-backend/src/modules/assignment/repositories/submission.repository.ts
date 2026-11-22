import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AssignmentSubmissionFile } from '../entities/assignment-submission-file.entity.js';
import { AssignmentSubmission } from '../entities/assignment-submission.entity.js';

/** Loads the student (and their account) together with a submission, for names and codes. */
const WITH_STUDENT = { student: { user: true } } as const;

/** All TypeORM access for submissions and their files. */
@Injectable()
export class SubmissionRepository {
  constructor(
    @InjectRepository(AssignmentSubmission)
    private readonly submissionOrmRepository: Repository<AssignmentSubmission>,
    @InjectRepository(AssignmentSubmissionFile)
    private readonly fileLinkOrmRepository: Repository<AssignmentSubmissionFile>,
  ) {}

  async findByStudent(
    assignmentId: string,
    studentId: string,
  ): Promise<AssignmentSubmission | null> {
    return this.submissionOrmRepository.findOne({
      where: { assignmentId, submittedBy: studentId },
    });
  }

  /** One submission with its student, or null. */
  async findById(id: string): Promise<AssignmentSubmission | null> {
    return this.submissionOrmRepository.findOne({
      where: { id },
      relations: WITH_STUDENT,
    });
  }

  /** Every submission of one assignment, newest first, with the student loaded. */
  async findAllByAssignment(
    assignmentId: string,
  ): Promise<AssignmentSubmission[]> {
    return this.submissionOrmRepository.find({
      where: { assignmentId },
      relations: WITH_STUDENT,
      order: { submittedAt: 'DESC' },
    });
  }

  /** Every submission of the given assignments, newest first, with the student loaded. */
  async findByAssignments(
    assignmentIds: string[],
  ): Promise<AssignmentSubmission[]> {
    if (assignmentIds.length === 0) return [];
    return this.submissionOrmRepository.find({
      where: { assignmentId: In(assignmentIds) },
      relations: WITH_STUDENT,
      order: { submittedAt: 'DESC' },
    });
  }

  /** One student's submissions among the given assignments. */
  async findByStudentInAssignments(
    studentId: string,
    assignmentIds: string[],
  ): Promise<AssignmentSubmission[]> {
    if (assignmentIds.length === 0) return [];
    return this.submissionOrmRepository.find({
      where: { submittedBy: studentId, assignmentId: In(assignmentIds) },
      relations: WITH_STUDENT,
    });
  }

  async count(assignmentId: string): Promise<number> {
    return this.submissionOrmRepository.count({ where: { assignmentId } });
  }

  /** Ids of the files that make up the submission. */
  async findFileIds(submissionId: string): Promise<string[]> {
    const links = await this.fileLinkOrmRepository.find({
      where: { submissionId },
    });
    return links.map((link) => link.fileId);
  }

  /** File ids of many submissions at once, keyed by submission id. */
  async findFileIdsBySubmissions(
    submissionIds: string[],
  ): Promise<Map<string, string[]>> {
    const links =
      submissionIds.length > 0
        ? await this.fileLinkOrmRepository.find({
            where: { submissionId: In(submissionIds) },
          })
        : [];
    const fileIdsBySubmission = new Map<string, string[]>();
    for (const link of links) {
      fileIdsBySubmission.set(link.submissionId, [
        ...(fileIdsBySubmission.get(link.submissionId) ?? []),
        link.fileId,
      ]);
    }
    return fileIdsBySubmission;
  }

  /**
   * Creates the student's submission or updates it in place, and makes its files match `fileIds`.
   * `answerText` is the online answer (null for file submissions).
   * Editing keeps the row and only moves `submittedAt` to the time of the edit.
   */
  async save(
    assignmentId: string,
    studentId: string,
    fileIds: string[],
    answerText: string | null,
    submittedAt: Date,
  ): Promise<AssignmentSubmission> {
    return this.submissionOrmRepository.manager.transaction(async (manager) => {
      const existing = await manager.findOne(AssignmentSubmission, {
        where: { assignmentId, submittedBy: studentId },
      });
      const submission = existing
        ? await manager.save(
            AssignmentSubmission,
            Object.assign(existing, { submittedAt, answerText }),
          )
        : await manager.save(
            manager.create(AssignmentSubmission, {
              assignmentId,
              submittedBy: studentId,
              submittedAt,
              answerText,
            }),
          );
      await manager.delete(AssignmentSubmissionFile, {
        submissionId: submission.id,
      });
      // An online answer has no files, and inserting an empty list would fail.
      if (fileIds.length > 0) {
        await manager.insert(
          AssignmentSubmissionFile,
          fileIds.map((fileId) => ({ submissionId: submission.id, fileId })),
        );
      }
      return submission;
    });
  }

  /** Stores the lecturer's grade; `gradedNotified` is reset so the student is told about the new grade. */
  async saveGrade(
    id: string,
    score: number,
    comment: string | null,
    gradedAt: Date,
  ): Promise<void> {
    await this.submissionOrmRepository.update(
      { id },
      { score, comment, gradedAt, gradedNotified: false },
    );
  }
}