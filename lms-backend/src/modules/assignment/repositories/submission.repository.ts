import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssignmentSubmissionFile } from '../entities/assignment-submission-file.entity.js';
import { AssignmentSubmission } from '../entities/assignment-submission.entity.js';

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

  /**
   * Creates the student's submission or updates it in place, and makes its files match `fileIds`.
   * Editing keeps the row (and any grade) and only moves `submittedAt` to the time of the edit.
   */
  async save(
    assignmentId: string,
    studentId: string,
    fileIds: string[],
    submittedAt: Date,
  ): Promise<AssignmentSubmission> {
    return this.submissionOrmRepository.manager.transaction(async (manager) => {
      const existing = await manager.findOne(AssignmentSubmission, {
        where: { assignmentId, submittedBy: studentId },
      });
      const submission = existing
        ? await manager.save(
            AssignmentSubmission,
            Object.assign(existing, { submittedAt }),
          )
        : await manager.save(
            manager.create(AssignmentSubmission, {
              assignmentId,
              submittedBy: studentId,
              submittedAt,
            }),
          );
      await manager.delete(AssignmentSubmissionFile, {
        submissionId: submission.id,
      });
      await manager.insert(
        AssignmentSubmissionFile,
        fileIds.map((fileId) => ({ submissionId: submission.id, fileId })),
      );
      return submission;
    });
  }
}