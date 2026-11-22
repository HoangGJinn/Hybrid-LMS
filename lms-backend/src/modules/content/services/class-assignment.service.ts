import { Injectable } from '@nestjs/common';
import type { ItemScope } from '../repositories/item-filters.js';
import {
  AssignmentItemRepository,
  type ClassAssignmentLink,
} from '../repositories/assignment-item.repository.js';

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
    scope: ItemScope = {},
  ): Promise<boolean> {
    return this.assignmentItemRepository.existsInClass(classId, assignmentId, scope);
  }

  /** The assignments shown by the given classes, as (assignment, class) pairs. */
  async findAssignmentsByClasses(
    classIds: string[],
    scope: ItemScope = {},
  ): Promise<ClassAssignmentLink[]> {
    return this.assignmentItemRepository.findByClasses(classIds, scope);
  }

  /** Places an existing assignment at the end of a section; false when the section is not of the class. */
  async addAssignmentToSection(
    classId: string,
    sectionId: string,
    assignmentId: string,
    title: string,
  ): Promise<boolean> {
    return this.assignmentItemRepository.appendToSection(
      classId,
      sectionId,
      assignmentId,
      title,
    );
  }

  /** Soft-deletes the assignment from every section of the class; returns how many section items were deleted. */
  async removeAssignment(
    classId: string,
    assignmentId: string,
    deletedBy: string | null = null,
  ): Promise<number> {
    return this.assignmentItemRepository.deleteItemsByAssignment(
      classId,
      assignmentId,
      deletedBy,
    );
  }

  /** Tells whether any section item, deleted or not, still points at the assignment. */
  async isAssignmentReferenced(assignmentId: string): Promise<boolean> {
    return this.assignmentItemRepository.isAssignmentReferenced(assignmentId);
  }

  /** Of the given assignments, the ids some section item (deleted or not) still points at. */
  async findReferencedAssignmentIds(assignmentIds: string[]): Promise<Set<string>> {
    return this.assignmentItemRepository.findReferencedIds(assignmentIds);
  }

  /** Permanently removes assignment items soft-deleted before `cutoff`; returns the assignments they pointed at. */
  async purgeDeletedAssignmentItems(cutoff: Date): Promise<string[]> {
    return this.assignmentItemRepository.purgeDeletedBefore(cutoff);
  }
}