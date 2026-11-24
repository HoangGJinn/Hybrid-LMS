import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { GradebookService } from '../services/gradebook.service.js';
import type { GradebookView } from '../types/gradebook.types.js';
import { GradebookController } from './gradebook.controller.js';

describe('GradebookController', () => {
  let controller: GradebookController;
  let mockService: Partial<
    Record<keyof GradebookService, ReturnType<typeof vi.fn>>
  >;

  const user = {
    id: 'lec-1',
    email: 'gv@lms.edu.vn',
    role: Role.LECTURER,
  } as AuthenticatedUser;

  beforeEach(() => {
    mockService = {
      getGradebook: vi.fn().mockResolvedValue({ classId: 'cls-1' } as GradebookView),
      exportGradebook: vi.fn().mockResolvedValue({
        fileName: 'Bang-diem-CS101.xlsx',
        buffer: Buffer.from('xlsx'),
      }),
    };
    controller = new GradebookController(
      mockService as unknown as GradebookService,
    );
  });

  it('returns gradebook for classId and query', async () => {
    const query = { page: 1, limit: 20 };
    const result = await controller.getGradebook('cls-1', query, user);

    expect(mockService.getGradebook).toHaveBeenCalledWith('cls-1', query, user);
    expect(result.classId).toBe('cls-1');
  });

  it('streams exported gradebook workbook via sendXlsx', async () => {
    const response = { set: vi.fn(), end: vi.fn() } as unknown as Response;

    await controller.exportGradebook('cls-1', user, response);

    expect(mockService.exportGradebook).toHaveBeenCalledWith('cls-1', user);
    expect(response.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Disposition':
          "attachment; filename*=UTF-8''Bang-diem-CS101.xlsx",
      }),
    );
    expect(response.end).toHaveBeenCalledWith(Buffer.from('xlsx'));
  });
});
