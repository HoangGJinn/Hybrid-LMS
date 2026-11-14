import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
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
  let mockRepository: {
    findById: Mock;
    findByIds: Mock;
    createPending: Mock;
    markReady: Mock;
    deleteById: Mock;
  };
  let mockStorage: {
    createDownloadUrl: Mock;
    createUploadForm: Mock;
    findObjectInfo: Mock;
    openReadStream: Mock;
    deleteObject: Mock;
  };
  let service: FileService;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByIds: vi.fn(),
      createPending: vi.fn(),
      markReady: vi.fn(),
      deleteById: vi.fn(),
    };
    mockStorage = {
      createDownloadUrl: vi.fn(),
      createUploadForm: vi.fn(),
      findObjectInfo: vi.fn(),
      openReadStream: vi.fn(),
      deleteObject: vi.fn(),
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

    describe('exam question files', () => {
      it('should store a lecturer\'s DOCX under the exams prefix', async () => {
        mockStorage.createUploadForm.mockResolvedValue({ url: 'u', fields: {} });

        const actualView = await service.requestUpload(
          buildUploadDto({
            purpose: FilePurpose.EXAM,
            fileName: 'de-thi.docx',
            contentType:
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
          lecturer,
        );

        const [mockPending] = mockRepository.createPending.mock.calls[0];
        expect(mockPending.storageKey).toBe(
          `exams/lec-1/${actualView.fileId}.docx`,
        );
      });

      it.each(['application/zip', 'video/mp4', 'text/plain'])(
        'should reject %s, which is not an exam format',
        async (contentType) => {
          await expect(
            service.requestUpload(
              buildUploadDto({ purpose: FilePurpose.EXAM, contentType }),
              lecturer,
            ),
          ).rejects.toBeInstanceOf(BadRequestException);
          expect(mockRepository.createPending).not.toHaveBeenCalled();
        },
      );

      it('should not let a student upload an exam file', async () => {
        await expect(
          service.requestUpload(
            buildUploadDto({ purpose: FilePurpose.EXAM }),
            student,
          ),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });
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

  describe('assertOwnedReadyFileOfPurpose', () => {
    const buildExamFile = (
      status: FileStatus,
      storageKey = 'exams/lec-1/file-1.pdf',
    ): FileAttachment => ({ ...buildFile(status), storageKey }) as FileAttachment;

    it('should pass for a READY file of the owner uploaded for that purpose', async () => {
      mockRepository.findById.mockResolvedValue(buildExamFile(FileStatus.READY));

      await expect(
        service.assertOwnedReadyFileOfPurpose('file-1', 'lec-1', FilePurpose.EXAM),
      ).resolves.toBeUndefined();
    });

    it('should reject a file uploaded for another purpose', async () => {
      mockRepository.findById.mockResolvedValue(
        buildExamFile(FileStatus.READY, 'documents/lec-1/file-1.pdf'),
      );

      await expect(
        service.assertOwnedReadyFileOfPurpose('file-1', 'lec-1', FilePurpose.EXAM),
      ).rejects.toThrow('This file cannot be used here');
    });

    it('should reject a key that only looks like the prefix', async () => {
      mockRepository.findById.mockResolvedValue(
        buildExamFile(FileStatus.READY, 'exams-old/lec-1/file-1.pdf'),
      );

      await expect(
        service.assertOwnedReadyFileOfPurpose('file-1', 'lec-1', FilePurpose.EXAM),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject a PENDING file', async () => {
      mockRepository.findById.mockResolvedValue(buildExamFile(FileStatus.PENDING));

      await expect(
        service.assertOwnedReadyFileOfPurpose('file-1', 'lec-1', FilePurpose.EXAM),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should treat a file of another owner as missing', async () => {
      mockRepository.findById.mockResolvedValue(buildExamFile(FileStatus.READY));

      await expect(
        service.assertOwnedReadyFileOfPurpose('file-1', 'someone-else', FilePurpose.EXAM),
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

  describe('assertOwnedReadyFiles', () => {
    it('passes when every file exists, is owned by the user, and is READY', async () => {
      mockRepository.findByIds.mockResolvedValue([
        buildFile(FileStatus.READY, 'lec-1'),
      ]);

      await expect(
        service.assertOwnedReadyFiles(['file-1'], 'lec-1'),
      ).resolves.toBeUndefined();
    });

    it('rejects missing, unconfirmed, or unowned files', async () => {
      mockRepository.findByIds.mockResolvedValue([]);
      await expect(
        service.assertOwnedReadyFiles(['file-1'], 'lec-1'),
      ).rejects.toBeInstanceOf(BadRequestException);

      mockRepository.findByIds.mockResolvedValue([
        buildFile(FileStatus.PENDING, 'lec-1'),
      ]);
      await expect(
        service.assertOwnedReadyFiles(['file-1'], 'lec-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('openReadStream', () => {
    it('opens a stream for a READY file and throws NotFoundException for missing or PENDING files', async () => {
      mockRepository.findById.mockResolvedValueOnce(null);
      await expect(service.openReadStream('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      mockRepository.findById.mockResolvedValueOnce(
        buildFile(FileStatus.PENDING),
      );
      await expect(service.openReadStream('file-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      const fakeStream = Readable.from(['hello']);
      mockStorage.openReadStream = vi.fn().mockResolvedValue(fakeStream);
      mockRepository.findById.mockResolvedValueOnce(buildFile(FileStatus.READY));

      const result = await service.openReadStream('file-1');
      expect(result.fileName).toBe('chuong1.pdf');
      expect(result.stream).toBe(fakeStream);
    });
  });

  describe('getDownloadLinks', () => {
    it('returns signed links in requested order and skips non-READY files', async () => {
      const f1 = { ...buildFile(FileStatus.READY), id: 'f-1' };
      const f2 = { ...buildFile(FileStatus.PENDING), id: 'f-2' };
      mockRepository.findByIds.mockResolvedValue([f1, f2]);
      mockStorage.createDownloadUrl.mockResolvedValue('https://signed/f1');

      const links = await service.getDownloadLinks(['f-2', 'f-1', 'f-missing']);
      expect(links).toHaveLength(1);
      expect(links[0].fileId).toBe('f-1');
    });
  });

  describe('deleteFile and deleteFiles', () => {
    it('deletes object before DB record and ignores missing files', async () => {
      mockRepository.findById.mockResolvedValueOnce(null);
      await service.deleteFile('missing');
      expect(mockStorage.deleteObject).not.toHaveBeenCalled();

      mockRepository.findById.mockResolvedValueOnce(buildFile(FileStatus.READY));
      await service.deleteFiles(['file-1']);
      expect(mockStorage.deleteObject).toHaveBeenCalledWith(
        'documents/lec-1/file-1.pdf',
      );
      expect(mockRepository.deleteById).toHaveBeenCalledWith('file-1');
    });
  });
});
