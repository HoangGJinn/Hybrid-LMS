import type { FileDownloadView } from '../../../shared/file/types/file-download-view.type.js';
import type { Document } from '../entities/document.entity.js';

/** Read model of one document, including the short-lived link the viewer loads the file from. */
export class DocumentView {
  readonly id: string;
  readonly title: string;
  readonly uploadedBy: string;
  readonly fileName: string;
  /** Presigned S3 GET URL; the frontend must request a fresh one instead of storing it. */
  readonly fileUrl: string;
  readonly isSeen: boolean;

  private constructor(
    entity: Document,
    link: FileDownloadView,
    isSeen: boolean,
  ) {
    this.id = entity.id;
    this.title = entity.title;
    this.uploadedBy = entity.uploadedBy;
    this.fileName = link.fileName;
    this.fileUrl = link.downloadUrl;
    this.isSeen = isSeen;
  }

  /** Combines a document with its download link without leaking the entity itself. */
  static from(
    entity: Document,
    link: FileDownloadView,
    isSeen: boolean,
  ): DocumentView {
    return new DocumentView(entity, link, isSeen);
  }
}
