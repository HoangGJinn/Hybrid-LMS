import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentItemRepository } from '../repositories/document-item.repository.js';

/** Which documents a class shows, and which of them a student has already opened. */
@Injectable()
export class ClassDocumentService {
  constructor(
    private readonly documentItemRepository: DocumentItemRepository,
  ) {}

  /** Lists the ids of the documents shown in the class, in display order. */
  async getDocumentIds(classId: string): Promise<string[]> {
    return this.documentItemRepository.findDocumentIdsByClassId(classId);
  }

  /** Tells whether the class shows the document; a document of another class must stay unreachable. */
  async isDocumentInClass(
    classId: string,
    documentId: string,
  ): Promise<boolean> {
    const itemIds = await this.documentItemRepository.findItemIdsByDocument(
      classId,
      documentId,
    );
    return itemIds.length > 0;
  }

  /** Returns the ids of the class's documents the student has opened. */
  async getSeenDocumentIds(
    classId: string,
    studentId: string,
  ): Promise<ReadonlySet<string>> {
    const documentIds =
      await this.documentItemRepository.findCompletedDocumentIds(
        classId,
        studentId,
      );
    return new Set(documentIds);
  }

  /** Marks the document as opened by the student; idempotent, and 404 when the class does not show it. */
  async markSeen(
    classId: string,
    documentId: string,
    studentId: string,
  ): Promise<void> {
    const itemIds = await this.documentItemRepository.findItemIdsByDocument(
      classId,
      documentId,
    );
    if (itemIds.length === 0) {
      throw new NotFoundException('Document not found in this class');
    }
    await this.documentItemRepository.markItemsCompleted(studentId, itemIds);
  }
    /** Removes the document from every section of the class; returns how many section items were removed. */
  async removeDocument(classId: string, documentId: string): Promise<number> {
    return this.documentItemRepository.deleteItemsByDocument(classId, documentId);
  }

  /** Tells whether any class still shows the document. */
  async isDocumentReferenced(documentId: string): Promise<boolean> {
    return this.documentItemRepository.isDocumentReferenced(documentId);
  }
}
