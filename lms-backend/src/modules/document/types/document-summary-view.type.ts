import type { Document } from '../entities/document.entity.js';

/** Read model of a document in a list: it carries no download URL, so cached lists can never hold an expired link. */
export class DocumentSummaryView {
  readonly id: string;
  readonly title: string;
  readonly uploadedBy: string;
  readonly fileName: string;
  /** Per-student: true once the student has opened the document in this class. */
  readonly isSeen: boolean;

  private constructor(entity: Document, isSeen: boolean) {
    this.id = entity.id;
    this.title = entity.title;
    this.uploadedBy = entity.uploadedBy;
    this.fileName = entity.file.fileName;
    this.isSeen = isSeen;
  }

  /** Maps an entity (with its file loaded) to its view without leaking the entity itself. */
  static fromEntity(entity: Document, isSeen: boolean): DocumentSummaryView {
    return new DocumentSummaryView(entity, isSeen);
  }
}
