import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentItemRepository } from '../repositories/document-item.repository.js';
import type { ItemScope } from '../repositories/item-filters.js';

/** Which documents a class shows, and which of them a student has already opened. */
@Injectable()
export class ClassDocumentService {
  constructor(
    private readonly documentItemRepository: DocumentItemRepository,
  ) {}

  /** Lists the ids of the documents shown in the class, in display order. */
  async getDocumentIds(classId: string, scope: ItemScope = {}): Promise<string[]> {
    return this.documentItemRepository.findDocumentIdsByClassId(classId, scope);
  }

  /** Tells whether the class shows the document; a document of another class must stay unreachable. */
  async isDocumentInClass(
    classId: string,
    documentId: string,
    scope: ItemScope = {},
  ): Promise<boolean> {
    const itemIds = await this.documentItemRepository.findItemIdsByDocument(
      classId,
      documentId,
      scope,
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
    scope: ItemScope = {},
  ): Promise<void> {
    const itemIds = await this.documentItemRepository.findItemIdsByDocument(
      classId,
      documentId,
      scope,
    );
    if (itemIds.length === 0) {
      throw new NotFoundException('Document not found in this class');
    }
    await this.documentItemRepository.markItemsCompleted(studentId, itemIds);
  }

  /** Soft-deletes the document from every section of the class; returns how many section items were deleted. */
  async removeDocument(
    classId: string,
    documentId: string,
    deletedBy: string | null = null,
  ): Promise<number> {
    return this.documentItemRepository.deleteItemsByDocument(
      classId,
      documentId,
      deletedBy,
    );
  }

  /** Tells whether any section item, deleted or not, still points at the document. */
  async isDocumentReferenced(documentId: string): Promise<boolean> {
    return this.documentItemRepository.isDocumentReferenced(documentId);
  }
}