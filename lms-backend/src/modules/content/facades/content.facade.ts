import { Injectable } from '@nestjs/common';
import { ClassDocumentService } from '../services/class-document.service.js';
import { ClassAssignmentService } from '../services/class-assignment.service.js';
import { ClassExamService } from '../services/class-exam.service.js';
import type { ItemScope } from '../repositories/item-filters.js';

/**
 * Public entry point of the content module.
 * Other modules (such as Document) MUST use this facade, NOT the services or repositories behind it.
 */
@Injectable()
export class ContentFacade {
  constructor(
    private readonly classDocumentService: ClassDocumentService,
    private readonly classAssignmentService: ClassAssignmentService,
    private readonly classExamService: ClassExamService,
  ) {}

  async getDocumentIdsInClass(classId: string, scope?: ItemScope): Promise<string[]> {
    return this.classDocumentService.getDocumentIds(classId, scope);
  }

  async isDocumentInClass(classId: string, documentId: string, scope?: ItemScope): Promise<boolean> {
    return this.classDocumentService.isDocumentInClass(classId, documentId, scope);
  }

  async getSeenDocumentIds(classId: string, studentId: string): Promise<ReadonlySet<string>> {
    return this.classDocumentService.getSeenDocumentIds(classId, studentId);
  }

  async markDocumentSeen(classId: string, documentId: string, studentId: string, scope?: ItemScope): Promise<void> {
    return this.classDocumentService.markSeen(classId, documentId, studentId, scope);
  }

  // async removeDocumentFromClass(classId: string, documentId: string): Promise<number> {
  //   return this.classDocumentService.removeDocument(classId, documentId);
  // }

  /** Soft-deletes the document's section items; `deletedBy` is the user who asked, kept for tracing. */
  async removeDocumentFromClass(
    classId: string,
    documentId: string,
    deletedBy?: string,
  ): Promise<number> {
    return this.classDocumentService.removeDocument(classId, documentId, deletedBy ?? null);
  }

  async isDocumentReferenced(documentId: string): Promise<boolean> {
    return this.classDocumentService.isDocumentReferenced(documentId);
  }

    /** The assignments shown by the given classes, as (assignment, class) pairs. */
  async findAssignmentsByClasses(
    classIds: string[],
    scope?: ItemScope,
  ): Promise<{ assignmentId: string; classId: string }[]> {
    return this.classAssignmentService.findAssignmentsByClasses(classIds, scope);
  }
  
  async isAssignmentInClass(classId: string, assignmentId: string, scope?: ItemScope): Promise<boolean> {
    return this.classAssignmentService.isAssignmentInClass(classId, assignmentId, scope);
  }

  /** Places an existing assignment at the end of a section; false when the section is not of the class. */
  async addAssignmentToSection(
    classId: string,
    sectionId: string,
    assignmentId: string,
    title: string,
  ): Promise<boolean> {
    return this.classAssignmentService.addAssignmentToSection(
      classId,
      sectionId,
      assignmentId,
      title,
    );
  }

  // async removeAssignmentFromClass(classId: string, assignmentId: string): Promise<number> {
  //   return this.classAssignmentService.removeAssignment(classId, assignmentId);
  // }

  /** Soft-deletes the assignment's section items; `deletedBy` is the user who asked, kept for tracing. */
  async removeAssignmentFromClass(
    classId: string,
    assignmentId: string,
    deletedBy?: string,
  ): Promise<number> {
    return this.classAssignmentService.removeAssignment(classId, assignmentId, deletedBy ?? null);
  }

  async isAssignmentReferenced(assignmentId: string): Promise<boolean> {
    return this.classAssignmentService.isAssignmentReferenced(assignmentId);
  }

  /** Of the given assignments, the ids some section item (deleted or not) still points at. */
  async findReferencedAssignmentIds(assignmentIds: string[]): Promise<Set<string>> {
    return this.classAssignmentService.findReferencedAssignmentIds(assignmentIds);
  }

  /** Clean-up job only: permanently drops assignment items soft-deleted before `cutoff`. */
  async purgeDeletedAssignmentItems(cutoff: Date): Promise<string[]> {
    return this.classAssignmentService.purgeDeletedAssignmentItems(cutoff);
  }

  /** The exams shown by the given classes, as (exam, class) pairs. */
  async findExamsByClasses(
    classIds: string[],
    scope?: ItemScope,
  ): Promise<{ examId: string; classId: string }[]> {
    return this.classExamService.findExamsByClasses(classIds, scope);
  }

  /** Tells whether a section of the class shows the exam. */
  async isExamInClass(classId: string, examId: string, scope?: ItemScope): Promise<boolean> {
    return this.classExamService.isExamInClass(classId, examId, scope);
  }

  /** Removes the exam from every section of the class; returns how many section items were removed. */
  // async removeExamFromClass(classId: string, examId: string): Promise<number> {
  //   return this.classExamService.removeExam(classId, examId);
  // }

  /** Soft-deletes the exam's section items; `deletedBy` is the user who asked, kept for tracing. */
  async removeExamFromClass(
    classId: string,
    examId: string,
    deletedBy?: string,
  ): Promise<number> {
    return this.classExamService.removeExam(classId, examId, deletedBy ?? null);
  }

  /** Tells whether any class still shows the exam. */
  async isExamReferenced(examId: string): Promise<boolean> {
    return this.classExamService.isExamReferenced(examId);
  }

}
