import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { RequestUploadDto } from '../dto/request-upload.dto.js';
import type { FileAttachment } from '../entities/file-attachment.entity.js';
import { FilePurpose } from '../enums/file-purpose.enum.js';
import { FileStatus } from '../enums/file-status.enum.js';
import type { FileRepository } from '../repositories/file.repository.js';
import type { FileStorageService } from './file-storage.service.js';
import { FileService } from './file.service.js';

type Mock = ReturnType<typeof vi.fn>;

const lecturer = {
  id: 'lec-1',
  role: Role.LECTURER,
} as unknown as AuthenticatedUser;
const student = {
  id: 'stu-1',
  role: Role.STUDENT,
} as unknown as AuthenticatedUser;

const buildFile = (
  status: FileStatus,
  ownerId: string | null = 'lec-1',
): FileAttachment =>
  ({
    id: 'file-1',
    ownerId,
    fileName: 'chuong1.pdf',
    storageKey: 'documents/lec-1/file-1.pdf',
    fileType: 'application/pdf',
    fileSize: '2500000',
    status,
  }) as unknown as FileAttachment;

const buildUploadDto = (
  overrides: Partial<RequestUploadDto> = {},
): RequestUploadDto => ({
  purpose: FilePurpose.DOCUMENT,
  fileName: 'chuong1.pdf',
  contentType: 'application/pdf',
  size: 2_500_000,
  ...overrides,
});

describe('FileService', () => {
  let mockRepository: { findById: Mock; createPending: Mock; markReady: Mock };
  let mockStorage: {
    createDownloadUrl: Mock;
    createUploadForm: Mock;
    findObjectInfo: Mock;
  };
  let service: FileService;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      createPending: vi.fn(),
      markReady: vi.fn(),
    };
    mockStorage = {
      createDownloadUrl: vi.fn(),
      createUploadForm: vi.fn(),
      findObjectInfo: vi.fn(),
    };
    service = new FileService(
      mockRepository as unknown as FileRepository,
      mockStorage as unknown as FileStorageService,
    );
  });

  describe('requestUpload', () => {
    it('should record a PENDING file under a key built from the allowed type, not the file name', async () => {
      mockStorage.createUploadForm.mockResolvedValue({
        url: 'https://s3.example/',
        fields: { key: 'k' },
      });

      const actualView = await service.requestUpload(
        buildUploadDto({ fileName: '../../evil.html' }),
        lecturer,
      );

      const [mockPending] = mockRepository.createPending.mock.calls[0];
      expect(mockPending.storageKey).toBe(
        `documents/lec-1/${actualView.fileId}.pdf`,
      );
      expect(mockPending).toMatchObject({
        id: actualView.fileId,
        ownerId: 'lec-1',
        fileName: '../../evil.html',
        fileType: 'application/pdf',
        fileSize: 2_500_000,
      });
      expect(actualView.upload).toEqual({
        url: 'https://s3.example/',
        fields: { key: 'k' },
      });
    });

    it('should sign the form for the stored key, content type and size cap', async () => {
      mockStorage.createUploadForm.mockResolvedValue({ url: 'u', fields: {} });

      const actualView = await service.requestUpload(
        buildUploadDto(),
        lecturer,
      );

      expect(mockStorage.createUploadForm).toHaveBeenCalledWith({
        storageKey: `documents/lec-1/${actualView.fileId}.pdf`,
        contentType: 'application/pdf',
        maxSizeBytes: 100 * 1024 * 1024,
      });
    });

    it('should reject an unsupported content type without touching the database', async () => {
      await expect(
        service.requestUpload(
          buildUploadDto({ contentType: 'text/html' }),
          lecturer,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockRepository.createPending).not.toHaveBeenCalled();
    });

    it('should reject a file above the size limit', async () => {
      await expect(
        service.requestUpload(
          buildUploadDto({ size: 100 * 1024 * 1024 + 1 }),
          lecturer,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockRepository.createPending).not.toHaveBeenCalled();
    });

    it('should reject roles that may not upload documents', async () => {
      await expect(
        service.requestUpload(buildUploadDto(), student),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('confirmUpload', () => {
    it('should mark the file READY when S3 holds an object of the declared size and type', async () => {
      mockRepository.findById.mockResolvedValue(buildFile(FileStatus.PENDING));
      mockStorage.findObjectInfo.mockResolvedValue({
        size: 2_500_000,
        contentType: 'application/pdf',
      });

      const actualView = await service.confirmUpload('file-1', lecturer);

      expect(mockRepository.markReady).toHaveBeenCalledWith('file-1');
      expect(actualView).toEqual({
        fileId: 'file-1',
        status: FileStatus.READY,
      });
    });

    it('should be idempotent for a file that is already READY', async () => {
      mockRepository.findById.mockResolvedValue(buildFile(FileStatus.READY));

      const actualView = await service.confirmUpload('file-1', lecturer);

      expect(actualView.status).toBe(FileStatus.READY);
      expect(mockStorage.findObjectInfo).not.toHaveBeenCalled();
    });

    it('should reject when the object never reached S3', async () => {
      mockRepository.findById.mockResolvedValue(buildFile(FileStatus.PENDING));
      mockStorage.findObjectInfo.mockResolvedValue(null);

      await expect(
        service.confirmUpload('file-1', lecturer),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockRepository.markReady).not.toHaveBeenCalled();
    });

    it('should reject when the stored size differs from the declared size', async () => {
      mockRepository.findById.mockResolvedValue(buildFile(FileStatus.PENDING));
      mockStorage.findObjectInfo.mockResolvedValue({
        size: 1,
        contentType: 'application/pdf',
      });

      await expect(
        service.confirmUpload('file-1', lecturer),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockRepository.markReady).not.toHaveBeenCalled();
    });

    it('should reject when the stored content type differs from the declared one', async () => {
      mockRepository.findById.mockResolvedValue(buildFile(FileStatus.PENDING));
      mockStorage.findObjectInfo.mockResolvedValue({
        size: 2_500_000,
        contentType: 'text/html',
      });

      await expect(
        service.confirmUpload('file-1', lecturer),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("should treat another user's file as missing", async () => {
      mockRepository.findById.mockResolvedValue(
        buildFile(FileStatus.PENDING, 'someone-else'),
      );

      await expect(
        service.confirmUpload('file-1', lecturer),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockStorage.findObjectInfo).not.toHaveBeenCalled();
    });
  });

  describe('assertOwnedReadyFile', () => {
    it('should pass for a READY file of the owner', async () => {
      mockRepository.findById.mockResolvedValue(buildFile(FileStatus.READY));

      await expect(
        service.assertOwnedReadyFile('file-1', 'lec-1'),
      ).resolves.toBeUndefined();
    });

    it('should reject a PENDING file', async () => {
      mockRepository.findById.mockResolvedValue(buildFile(FileStatus.PENDING));

      await expect(
        service.assertOwnedReadyFile('file-1', 'lec-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject a file of another owner and a legacy file without owner', async () => {
      mockRepository.findById.mockResolvedValueOnce(
        buildFile(FileStatus.READY, 'other'),
      );
      await expect(
        service.assertOwnedReadyFile('file-1', 'lec-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      mockRepository.findById.mockResolvedValueOnce(
        buildFile(FileStatus.READY, null),
      );
      await expect(
        service.assertOwnedReadyFile('file-1', 'lec-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getDownloadLink', () => {
    it('should return a signed link for a READY file', async () => {
      mockRepository.findById.mockResolvedValue(buildFile(FileStatus.READY));
      mockStorage.createDownloadUrl.mockResolvedValue(
        'https://signed.example/file',
      );

      const actualLink = await service.getDownloadLink('file-1');

      expect(actualLink).toMatchObject({
        fileId: 'file-1',
        fileName: 'chuong1.pdf',
        contentType: 'application/pdf',
        size: 2500000,
        downloadUrl: 'https://signed.example/file',
      });
    });

    it('should throw NotFoundException for a PENDING file and never sign it', async () => {
      mockRepository.findById.mockResolvedValue(buildFile(FileStatus.PENDING));

      await expect(service.getDownloadLink('file-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockStorage.createDownloadUrl).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the file does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getDownloadLink('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
