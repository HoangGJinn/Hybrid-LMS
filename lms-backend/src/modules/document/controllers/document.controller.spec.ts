import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { DocumentService } from '../services/document.service.js';
import type { DocumentSummaryView } from '../types/document-summary-view.type.js';
import type { DocumentView } from '../types/document-view.type.js';
import { DocumentController } from './document.controller.js';

type Mock = ReturnType<typeof vi.fn>;

const CLASS_ID = '3f2b6c1e-8d4a-4e5b-9c7a-1a2b3c4d5e6f';
const DOCUMENT_ID = '7a1d2c3b-4e5f-4a6b-8c9d-0e1f2a3b4c5d';
const user = {
  id: 'stu-1',
  role: Role.STUDENT,
} as unknown as AuthenticatedUser;

describe('DocumentController', () => {
  let mockService: {
    findByClass: Mock;
    findOne: Mock;
    markSeen: Mock;
    create: Mock;
  };
  let controller: DocumentController;

  beforeEach(() => {
    mockService = {
      findByClass: vi.fn(),
      findOne: vi.fn(),
      markSeen: vi.fn(),
      create: vi.fn(),
    };
    controller = new DocumentController(
      mockService as unknown as DocumentService,
    );
  });

  it('should answer the smoke test', () => {
    expect(controller.getTest()).toBe('Document module is working');
  });

  it('should list the documents of the class from the service', async () => {
    const expectedViews = [{ id: 'doc-1' }] as unknown as DocumentSummaryView[];
    mockService.findByClass.mockResolvedValue(expectedViews);

    await expect(controller.findAll(CLASS_ID, user)).resolves.toBe(
      expectedViews,
    );
    expect(mockService.findByClass).toHaveBeenCalledWith(CLASS_ID, user);
  });

  it('should create a document through the service', async () => {
    const inputDto = { title: 'Chuong 1', fileId: 'file-1' };
    const expectedView = { id: 'doc-new' } as unknown as DocumentSummaryView;
    mockService.create.mockResolvedValue(expectedView);

    await expect(controller.create(CLASS_ID, inputDto, user)).resolves.toBe(
      expectedView,
    );
    expect(mockService.create).toHaveBeenCalledWith(CLASS_ID, inputDto, user);
  });

  it('should return one document from the service', async () => {
    const expectedView = { id: DOCUMENT_ID } as unknown as DocumentView;
    mockService.findOne.mockResolvedValue(expectedView);

    await expect(controller.findOne(CLASS_ID, DOCUMENT_ID, user)).resolves.toBe(
      expectedView,
    );
    expect(mockService.findOne).toHaveBeenCalledWith(
      CLASS_ID,
      DOCUMENT_ID,
      user,
    );
  });

  it('should record a view through the service', async () => {
    await controller.markSeen(CLASS_ID, DOCUMENT_ID, user);

    expect(mockService.markSeen).toHaveBeenCalledWith(
      CLASS_ID,
      DOCUMENT_ID,
      user,
    );
  });

  it('should propagate service errors', async () => {
    const expectedError = new Error('forbidden');
    mockService.findOne.mockRejectedValue(expectedError);

    await expect(controller.findOne(CLASS_ID, DOCUMENT_ID, user)).rejects.toBe(
      expectedError,
    );
  });
});
