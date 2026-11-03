import { Injectable } from '@nestjs/common';
import { ClassDocumentService } from '../services/class-document.service.js';
import { ClassAssignmentService } from '../services/class-assignment.service.js';


/**
 * Public entry point of the content module.
 * Other modules (such as Document) MUST use this facade, NOT the services or repositories behind it.
 */
@Injectable()
export class ContentFacade {
  constructor(
    private readonly classDocumentService: ClassDocumentService,
    private readonly classAssignmentService: ClassAssignmentService,
  ) {}

  async getDocumentIdsInClass(classId: string): Promise<string[]> {
    return this.classDocumentService.getDocumentIds(classId);
  }

  async isDocumentInClass(classId: string, documentId: string): Promise<boolean> {
    return this.classDocumentService.isDocumentInClass(classId, documentId);
  }

  async getSeenDocumentIds(classId: string, studentId: string): Promise<ReadonlySet<string>> {
    return this.classDocumentService.getSeenDocumentIds(classId, studentId);
  }

  async markDocumentSeen(classId: string, documentId: string, studentId: string): Promise<void> {
    return this.classDocumentService.markSeen(classId, documentId, studentId);
  }

    async removeDocumentFromClass(classId: string, documentId: string): Promise<number> {
    return this.classDocumentService.removeDocument(classId, documentId);
  }

  async isDocumentReferenced(documentId: string): Promise<boolean> {
    return this.classDocumentService.isDocumentReferenced(documentId);
  }

    /** The assignments shown by the given classes, as (assignment, class) pairs. */
  async findAssignmentsByClasses(
    classIds: string[],
  ): Promise<{ assignmentId: string; classId: string }[]> {
    return this.classAssignmentService.findAssignmentsByClasses(classIds);
  }
  
  async isAssignmentInClass(classId: string, assignmentId: string): Promise<boolean> {
    return this.classAssignmentService.isAssignmentInClass(classId, assignmentId);
  }

  async removeAssignmentFromClass(classId: string, assignmentId: string): Promise<number> {
    return this.classAssignmentService.removeAssignment(classId, assignmentId);
  }

  async isAssignmentReferenced(assignmentId: string): Promise<boolean> {
    return this.classAssignmentService.isAssignmentReferenced(assignmentId);
  }

}
