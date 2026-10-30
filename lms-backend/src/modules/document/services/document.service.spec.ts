import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { FileFacade } from '../../../shared/file/facades/file.facade.js';
import type { AcademicFacade } from '../../academic/facades/academic.facade.js';
import type { ContentFacade } from '../../content/facades/content.facade.js';
import type { Document } from '../entities/document.entity.js';
import type { DocumentRepository } from '../repositories/document.repository.js';
import { DocumentService } from './document.service.js';

type Mock = ReturnType<typeof vi.fn>;

const CLASS_ID = 'class-1';
const DOCUMENT_ID = 'doc-1';
const student = {
  id: 'stu-1',
  role: Role.STUDENT,
} as unknown as AuthenticatedUser;
const lecturer = {
  id: 'lec-1',
  role: Role.LECTURER,
} as unknown as AuthenticatedUser;

const buildDocument = (id: string): Document =>
  ({
    id,
    title: `Title ${id}`,
    uploadedBy: 'lec-1',
    fileId: `file-${id}`,
    file: { fileName: `${id}.pdf` },
  }) as unknown as Document;

describe('DocumentService', () => {
  let mockRepository: { findByIds: Mock; findById: Mock; create: Mock };
  let mockAcademic: { assertCanViewClass: Mock; assertCanManageClass: Mock };
  let mockContent: {
    getDocumentIdsInClass: Mock;
    isDocumentInClass: Mock;
    getSeenDocumentIds: Mock;
    markDocumentSeen: Mock;
  };
  let mockFile: { getDownloadLink: Mock; assertOwnedReadyFile: Mock };
  let service: DocumentService;

  beforeEach(() => {
    mockRepository = { findByIds: vi.fn(), findById: vi.fn(), create: vi.fn() };
    mockAcademic = {
      assertCanViewClass: vi.fn().mockResolvedValue(undefined),
      assertCanManageClass: vi.fn().mockResolvedValue(undefined),
    };
    mockContent = {
      getDocumentIdsInClass: vi.fn(),
      isDocumentInClass: vi.fn(),
      getSeenDocumentIds: vi.fn().mockResolvedValue(new Set<string>()),
      markDocumentSeen: vi.fn(),
    };
    mockFile = {
      getDownloadLink: vi.fn(),
      assertOwnedReadyFile: vi.fn().mockResolvedValue(undefined),
    };
    service = new DocumentService(
      mockRepository as unknown as DocumentRepository,
      mockAcademic as unknown as AcademicFacade,
      mockContent as unknown as ContentFacade,
      mockFile as unknown as FileFacade,
    );
  });

  describe('create', () => {
    const inputDto = { title: 'Chuong 1', fileId: 'file-doc-new' };

    it('should create the document for a READY file owned by the lecturer', async () => {
      mockRepository.create.mockResolvedValue(buildDocument('doc-new'));

      const actualView = await service.create(CLASS_ID, inputDto, lecturer);

      expect(mockFile.assertOwnedReadyFile).toHaveBeenCalledWith(
        'file-doc-new',
        'lec-1',
      );
      expect(mockRepository.create).toHaveBeenCalledWith({
        uploadedBy: 'lec-1',
        title: 'Chuong 1',
        fileId: 'file-doc-new',
      });
      expect(actualView).toMatchObject({ id: 'doc-new', isSeen: false });
    });

    it('should reject lecturers who do not manage the class before touching the file', async () => {
      mockAcademic.assertCanManageClass.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        service.create(CLASS_ID, inputDto, lecturer),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockFile.assertOwnedReadyFile).not.toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should not create a document when the file is not owned or not READY', async () => {
      mockFile.assertOwnedReadyFile.mockRejectedValue(new NotFoundException());

      await expect(
        service.create(CLASS_ID, inputDto, lecturer),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findByClass', () => {
    it('should keep the display order of the class and flag seen documents', async () => {
      mockContent.getDocumentIdsInClass.mockResolvedValue(['doc-2', 'doc-1']);
      mockRepository.findByIds.mockResolvedValue([
        buildDocument('doc-1'),
        buildDocument('doc-2'),
      ]);
      mockContent.getSeenDocumentIds.mockResolvedValue(new Set(['doc-1']));

      const actualViews = await service.findByClass(CLASS_ID, student);

      expect(actualViews.map((view) => [view.id, view.isSeen])).toEqual([
        ['doc-2', false],
        ['doc-1', true],
      ]);
      expect(actualViews[0]).not.toHaveProperty('fileUrl');
    });

    it('should skip ids whose document record no longer exists', async () => {
      mockContent.getDocumentIdsInClass.mockResolvedValue(['doc-1', 'ghost']);
      mockRepository.findByIds.mockResolvedValue([buildDocument('doc-1')]);

      const actualViews = await service.findByClass(CLASS_ID, lecturer);

      expect(actualViews.map((view) => view.id)).toEqual(['doc-1']);
    });

    it('should not load seen state for staff', async () => {
      mockContent.getDocumentIdsInClass.mockResolvedValue([]);
      mockRepository.findByIds.mockResolvedValue([]);

      await service.findByClass(CLASS_ID, lecturer);

      expect(mockContent.getSeenDocumentIds).not.toHaveBeenCalled();
    });

    it('should reject users who cannot view the class', async () => {
      mockAcademic.assertCanViewClass.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        service.findByClass(CLASS_ID, student),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockContent.getDocumentIdsInClass).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return the document with a freshly signed file URL', async () => {
      mockContent.isDocumentInClass.mockResolvedValue(true);
      mockRepository.findById.mockResolvedValue(buildDocument(DOCUMENT_ID));
      mockFile.getDownloadLink.mockResolvedValue({
        fileName: 'chuong1.pdf',
        downloadUrl: 'https://signed.example/file',
      });
      mockContent.getSeenDocumentIds.mockResolvedValue(new Set([DOCUMENT_ID]));

      const actualView = await service.findOne(CLASS_ID, DOCUMENT_ID, student);

      expect(actualView).toMatchObject({
        id: DOCUMENT_ID,
        fileName: 'chuong1.pdf',
        fileUrl: 'https://signed.example/file',
        isSeen: true,
      });
      expect(mockFile.getDownloadLink).toHaveBeenCalledWith(
        `file-${DOCUMENT_ID}`,
      );
    });

    it('should reject a document that belongs to another class before signing anything', async () => {
      mockContent.isDocumentInClass.mockResolvedValue(false);

      await expect(
        service.findOne(CLASS_ID, DOCUMENT_ID, student),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockFile.getDownloadLink).not.toHaveBeenCalled();
    });

    it('should reject users who cannot view the class before checking the document', async () => {
      mockAcademic.assertCanViewClass.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        service.findOne(CLASS_ID, DOCUMENT_ID, student),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockContent.isDocumentInClass).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the document record is missing', async () => {
      mockContent.isDocumentInClass.mockResolvedValue(true);
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.findOne(CLASS_ID, DOCUMENT_ID, student),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should propagate the file module error when the file is not READY', async () => {
      const expectedError = new NotFoundException('File not found');
      mockContent.isDocumentInClass.mockResolvedValue(true);
      mockRepository.findById.mockResolvedValue(buildDocument(DOCUMENT_ID));
      mockFile.getDownloadLink.mockRejectedValue(expectedError);

      await expect(
        service.findOne(CLASS_ID, DOCUMENT_ID, student),
      ).rejects.toBe(expectedError);
    });
  });

  describe('markSeen', () => {
    it('should record the view for a student', async () => {
      await service.markSeen(CLASS_ID, DOCUMENT_ID, student);

      expect(mockContent.markDocumentSeen).toHaveBeenCalledWith(
        CLASS_ID,
        DOCUMENT_ID,
        'stu-1',
      );
    });

    it('should do nothing for staff', async () => {
      await service.markSeen(CLASS_ID, DOCUMENT_ID, lecturer);

      expect(mockContent.markDocumentSeen).not.toHaveBeenCalled();
    });

    it('should reject users who cannot view the class', async () => {
      mockAcademic.assertCanViewClass.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        service.markSeen(CLASS_ID, DOCUMENT_ID, student),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockContent.markDocumentSeen).not.toHaveBeenCalled();
    });
  });
});
