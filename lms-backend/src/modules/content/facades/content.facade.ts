import { Injectable } from '@nestjs/common';
import { ClassDocumentService } from '../services/class-document.service.js';

/**
 * Public entry point of the content module.
 * Other modules (such as Document) MUST use this facade, NOT the services or repositories behind it.
 */
@Injectable()
export class ContentFacade {
  constructor(private readonly classDocumentService: ClassDocumentService) {}

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
}
