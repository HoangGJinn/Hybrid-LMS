import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentItemRepository } from '../repositories/document-item.repository.js';
import { ClassDocumentService } from './class-document.service.js';

type Mock = ReturnType<typeof vi.fn>;

describe('ClassDocumentService', () => {
  let mockRepository: {
    findDocumentIdsByClassId: Mock;
    findItemIdsByDocument: Mock;
    findCompletedDocumentIds: Mock;
    markItemsCompleted: Mock;
  };
  let service: ClassDocumentService;

  beforeEach(() => {
    mockRepository = {
      findDocumentIdsByClassId: vi.fn(),
      findItemIdsByDocument: vi.fn(),
      findCompletedDocumentIds: vi.fn(),
      markItemsCompleted: vi.fn(),
    };
    service = new ClassDocumentService(
      mockRepository as unknown as DocumentItemRepository,
    );
  });

  it('should list the document ids of a class from the repository', async () => {
    mockRepository.findDocumentIdsByClassId.mockResolvedValue([
      'doc-1',
      'doc-2',
    ]);

    await expect(service.getDocumentIds('class-1')).resolves.toEqual([
      'doc-1',
      'doc-2',
    ]);
  });

  describe('isDocumentInClass', () => {
    it('should be true when a section item of the class shows the document', async () => {
      mockRepository.findItemIdsByDocument.mockResolvedValue(['item-1']);

      await expect(service.isDocumentInClass('class-1', 'doc-1')).resolves.toBe(
        true,
      );
    });

    it('should be false when no section item of the class shows the document', async () => {
      mockRepository.findItemIdsByDocument.mockResolvedValue([]);

      await expect(service.isDocumentInClass('class-1', 'doc-1')).resolves.toBe(
        false,
      );
    });
  });

  it('should return the seen document ids as a set', async () => {
    mockRepository.findCompletedDocumentIds.mockResolvedValue(['doc-1']);

    const actualSeenIds = await service.getSeenDocumentIds('class-1', 'stu-1');

    expect(actualSeenIds.has('doc-1')).toBe(true);
    expect(actualSeenIds.has('doc-2')).toBe(false);
  });

  describe('markSeen', () => {
    it('should complete every item that shows the document', async () => {
      mockRepository.findItemIdsByDocument.mockResolvedValue([
        'item-1',
        'item-2',
      ]);

      await service.markSeen('class-1', 'doc-1', 'stu-1');

      expect(mockRepository.markItemsCompleted).toHaveBeenCalledWith('stu-1', [
        'item-1',
        'item-2',
      ]);
    });

    it('should throw NotFoundException when the class does not show the document', async () => {
      mockRepository.findItemIdsByDocument.mockResolvedValue([]);

      await expect(
        service.markSeen('class-1', 'doc-9', 'stu-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockRepository.markItemsCompleted).not.toHaveBeenCalled();
    });
  });
});
