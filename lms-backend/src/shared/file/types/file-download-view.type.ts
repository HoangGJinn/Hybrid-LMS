import type { FileAttachment } from '../entities/file-attachment.entity.js';

/** Short-lived download link for one file, shaped for other modules. */
export class FileDownloadView {
  readonly fileId: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly size: number;
  /** Presigned GET URL; it expires quickly, so it must never be stored or hardcoded. */
  readonly downloadUrl: string;

  private constructor(entity: FileAttachment, downloadUrl: string) {
    this.fileId = entity.id;
    this.fileName = entity.fileName;
    this.contentType = entity.fileType;
    this.size = Number(entity.fileSize);
    this.downloadUrl = downloadUrl;
  }

  /** Maps an entity and its signed URL to a view without leaking the entity itself. */
  static fromEntity(
    entity: FileAttachment,
    downloadUrl: string,
  ): FileDownloadView {
    return new FileDownloadView(entity, downloadUrl);
  }
}
