import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { UPLOAD_RULES } from '../constants/upload-rules.constant.js';
import type { RequestUploadDto } from '../dto/request-upload.dto.js';
import type { FileAttachment } from '../entities/file-attachment.entity.js';
import { FileStatus } from '../enums/file-status.enum.js';
import { FileRepository } from '../repositories/file.repository.js';
import { FileConfirmView } from '../types/file-confirm-view.type.js';
import { FileDownloadView } from '../types/file-download-view.type.js';
import { UploadRequestView } from '../types/upload-request-view.type.js';
import { FileStorageService } from './file-storage.service.js';

/** Business rules for uploading and reading stored files. */
@Injectable()
export class FileService {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  /**
   * Step 1 of an upload: validates the request, records the file as PENDING and signs an S3 POST form.
   * The extension in the S3 key comes from the allowed content type, never from the client's file name.
   */
  async requestUpload(
    dto: RequestUploadDto,
    user: AuthenticatedUser,
  ): Promise<UploadRequestView> {
    const rule = UPLOAD_RULES[dto.purpose];
    if (!rule.allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'You are not allowed to upload this kind of file',
      );
    }
    const extension = rule.extensionByContentType[dto.contentType];
    if (!extension) {
      throw new BadRequestException('This file format is not supported');
    }
    if (dto.size > rule.maxSizeBytes) {
      throw new BadRequestException('This file is too large');
    }
    const fileId = randomUUID();
    const storageKey = `${rule.keyPrefix}/${user.id}/${fileId}.${extension}`;
    await this.fileRepository.createPending({
      id: fileId,
      ownerId: user.id,
      fileName: dto.fileName,
      storageKey,
      fileType: dto.contentType,
      fileSize: dto.size,
    });
    const upload = await this.fileStorageService.createUploadForm({
      storageKey,
      contentType: dto.contentType,
      maxSizeBytes: rule.maxSizeBytes,
    });
    return new UploadRequestView(fileId, upload);
  }

  /**
   * Step 3 of an upload: asks S3 (HeadObject) whether the object really exists with the declared
   * size and type, and only then flips the file to READY. Confirming twice is harmless.
   */
  async confirmUpload(
    fileId: string,
    user: AuthenticatedUser,
  ): Promise<FileConfirmView> {
    const file = await this.findOwnedFile(fileId, user.id);
    if (file.status === FileStatus.READY) {
      return new FileConfirmView(file.id, file.status);
    }
    const info = await this.fileStorageService.findObjectInfo(file.storageKey);
    if (!info) {
      throw new BadRequestException(
        'The file was not uploaded; please upload it again',
      );
    }
    if (
      info.size !== Number(file.fileSize) ||
      info.contentType !== file.fileType
    ) {
      throw new BadRequestException(
        'The uploaded file does not match its description',
      );
    }
    await this.fileRepository.markReady(file.id);
    return new FileConfirmView(file.id, FileStatus.READY);
  }

  /** Throws unless the file exists, belongs to the owner and is READY: the check before attaching it to content. */
  async assertOwnedReadyFile(fileId: string, ownerId: string): Promise<void> {
    const file = await this.findOwnedFile(fileId, ownerId);
    if (file.status !== FileStatus.READY) {
      throw new BadRequestException('The file upload has not been confirmed');
    }
  }

  /**
   * Returns a presigned download link for a READY file.
   * PENDING files are treated as missing: their upload was never confirmed, so S3 may not hold them.
   */
  async getDownloadLink(fileId: string): Promise<FileDownloadView> {
    const file = await this.fileRepository.findById(fileId);
    if (!file || file.status !== FileStatus.READY) {
      throw new NotFoundException('File not found');
    }
    const downloadUrl = await this.fileStorageService.createDownloadUrl({
      storageKey: file.storageKey,
      fileName: file.fileName,
      contentType: file.fileType,
    });
    return FileDownloadView.fromEntity(file, downloadUrl);
  }

  /** A file of someone else looks exactly like a missing file, so ids cannot be probed. */
  private async findOwnedFile(
    fileId: string,
    ownerId: string,
  ): Promise<FileAttachment> {
    const file = await this.fileRepository.findById(fileId);
    if (!file || file.ownerId !== ownerId) {
      throw new NotFoundException('File not found');
    }
    return file;
  }
}
