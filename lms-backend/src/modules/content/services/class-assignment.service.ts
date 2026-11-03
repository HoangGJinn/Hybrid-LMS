import { Injectable } from '@nestjs/common';
import { AssignmentItemRepository } from '../repositories/assignment-item.repository.js';

/** Which assignments a class shows. */
@Injectable()
export class ClassAssignmentService {
  constructor(
    private readonly assignmentItemRepository: AssignmentItemRepository,
  ) {}

  /** Tells whether the class shows the assignment; an assignment of another class must stay unreachable. */
  async isAssignmentInClass(
    classId: string,
    assignmentId: string,
  ): Promise<boolean> {
    return this.assignmentItemRepository.existsInClass(classId, assignmentId);
  }

  /** Removes the assignment from every section of the class; returns how many section items were removed. */
  async removeAssignment(
    classId: string,
    assignmentId: string,
  ): Promise<number> {
    return this.assignmentItemRepository.deleteItemsByAssignment(
      classId,
      assignmentId,
    );
  }

  /** Tells whether any class still shows the assignment. */
  async isAssignmentReferenced(assignmentId: string): Promise<boolean> {
    return this.assignmentItemRepository.isAssignmentReferenced(assignmentId);
  }
}