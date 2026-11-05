import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AssignmentFile } from '../entities/assignment-file.entity.js';
import { Assignment } from '../entities/assignment.entity.js';
import { SubmissionType } from '../enums/submission-type.enum.js';

export interface NewAssignment {
  readonly title: string;
  readonly instruction: string;
  readonly openAt: Date;
  readonly endAt: Date;
  readonly submissionType: SubmissionType;
  readonly acceptedExtensions: string[];
  readonly submissionNote: string | null;
}

/** All TypeORM access for assignments and their attached files. */
@Injectable()
export class AssignmentRepository {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentOrmRepository: Repository<Assignment>,
    @InjectRepository(AssignmentFile)
    private readonly fileLinkOrmRepository: Repository<AssignmentFile>,
  ) {}

  /** Creates the assignment and links its attached files in one transaction. */
  async create(input: NewAssignment, fileIds: string[]): Promise<Assignment> {
    return this.assignmentOrmRepository.manager.transaction(async (manager) => {
      const assignment = await manager.save(manager.create(Assignment, input));
      if (fileIds.length > 0) {
        await manager.insert(
          AssignmentFile,
          fileIds.map((fileId) => ({ assignmentId: assignment.id, fileId })),
        );
      }
      return assignment;
    });
  }

  /**
   * Overwrites the assignment's fields, unlinks the removed files and links the new ones in one transaction.
   * Returns null when the assignment no longer exists.
   */
  async update(
    id: string,
    input: NewAssignment,
    removedFileIds: string[],
    addedFileIds: string[],
  ): Promise<Assignment | null> {
    return this.assignmentOrmRepository.manager.transaction(async (manager) => {
      await manager.update(Assignment, { id }, input);
      if (removedFileIds.length > 0) {
        await manager.delete(AssignmentFile, {
          assignmentId: id,
          fileId: In(removedFileIds),
        });
      }
      if (addedFileIds.length > 0) {
        await manager.insert(
          AssignmentFile,
          addedFileIds.map((fileId) => ({ assignmentId: id, fileId })),
        );
      }
      return manager.findOne(Assignment, { where: { id } });
    });
  }

  async findById(id: string): Promise<Assignment | null> {
    return this.assignmentOrmRepository.findOne({ where: { id } });
  }

  /** Assignments with the given ids; an empty list yields an empty result without a query. */
  async findByIds(ids: string[]): Promise<Assignment[]> {
    if (ids.length === 0) return [];
    return this.assignmentOrmRepository.find({ where: { id: In(ids) } });
  }

  /** Ids of the files attached to the assignment's brief. */
  async findFileIds(assignmentId: string): Promise<string[]> {
    const links = await this.fileLinkOrmRepository.find({
      where: { assignmentId },
    });
    return links.map((link) => link.fileId);
  }

  /** Deletes the assignment; attached-file links and submissions go with it through the database cascade. */
  async deleteById(id: string): Promise<void> {
    await this.assignmentOrmRepository.delete({ id });
  }
}