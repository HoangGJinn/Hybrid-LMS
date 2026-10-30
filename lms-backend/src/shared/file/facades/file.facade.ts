import { Injectable } from '@nestjs/common';
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
}
