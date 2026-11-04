import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { FileService } from '../services/file.service.js';
import { FileDownloadView } from '../types/file-download-view.type.js';

/** Public entry point of the file module; other modules must not use FileService directly. */
@Injectable()
export class FileFacade {
  constructor(private readonly fileService: FileService) {}

  /** Throws 404 unless the file exists and is READY; the caller is responsible for authorization. */
  async getDownloadLink(fileId: string): Promise<FileDownloadView> {
    return this.fileService.getDownloadLink(fileId);
  }

  /** Throws unless the file belongs to the owner and its upload was confirmed (READY). */
  async assertOwnedReadyFile(fileId: string, ownerId: string): Promise<void> {
    return this.fileService.assertOwnedReadyFile(fileId, ownerId);
  }

  /** Deletes the file from S3 and from the database. The caller must already have checked who may do it. */
  async deleteFile(fileId: string): Promise<void> {
    return this.fileService.deleteFile(fileId);
  }

  /** Throws unless every file belongs to the owner and has been confirmed (READY). */
  async assertOwnedReadyFiles(
    fileIds: string[],
    ownerId: string,
  ): Promise<void> {
    return this.fileService.assertOwnedReadyFiles(fileIds, ownerId);
  }

  /** Signed download links for the given files, in order. */
  async getDownloadLinks(fileIds: string[]): Promise<FileDownloadView[]> {
    return this.fileService.getDownloadLinks(fileIds);
  }

  /** Deletes the files from S3 and the database. The caller must already have checked who may do it. */
  async deleteFiles(fileIds: string[]): Promise<void> {
    return this.fileService.deleteFiles(fileIds);
  }

  /** Opens a READY file as a stream (used to zip submissions). The caller must already have checked who may read it. */
  async openReadStream(
    fileId: string,
  ): Promise<{ fileName: string; stream: Readable }> {
    return this.fileService.openReadStream(fileId);
  }
}
