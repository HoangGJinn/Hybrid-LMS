import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { RequestUploadDto } from '../dto/request-upload.dto.js';
import { FilePurpose } from '../enums/file-purpose.enum.js';
import type { FileService } from '../services/file.service.js';
import type { FileConfirmView } from '../types/file-confirm-view.type.js';
import type { UploadRequestView } from '../types/upload-request-view.type.js';
import { FileController } from './file.controller.js';

type Mock = ReturnType<typeof vi.fn>;

const FILE_ID = '7a1d2c3b-4e5f-4a6b-8c9d-0e1f2a3b4c5d';
const user = {
  id: 'lec-1',
  role: Role.LECTURER,
} as unknown as AuthenticatedUser;

describe('FileController', () => {
  let mockService: { requestUpload: Mock; confirmUpload: Mock };
  let controller: FileController;

  beforeEach(() => {
    mockService = { requestUpload: vi.fn(), confirmUpload: vi.fn() };
    controller = new FileController(mockService as unknown as FileService);
  });

  it('should answer the smoke test', () => {
    expect(controller.getTest()).toBe('File module is working');
  });

  it('should request an upload through the service', async () => {
    const inputDto: RequestUploadDto = {
      purpose: FilePurpose.DOCUMENT,
      fileName: 'a.pdf',
      contentType: 'application/pdf',
      size: 10,
    };
    const expectedView = { fileId: FILE_ID } as unknown as UploadRequestView;
    mockService.requestUpload.mockResolvedValue(expectedView);

    await expect(controller.requestUpload(inputDto, user)).resolves.toBe(
      expectedView,
    );
    expect(mockService.requestUpload).toHaveBeenCalledWith(inputDto, user);
  });

  it('should confirm an upload through the service', async () => {
    const expectedView = { fileId: FILE_ID } as unknown as FileConfirmView;
    mockService.confirmUpload.mockResolvedValue(expectedView);

    await expect(controller.confirmUpload(FILE_ID, user)).resolves.toBe(
      expectedView,
    );
    expect(mockService.confirmUpload).toHaveBeenCalledWith(FILE_ID, user);
  });
});
