import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { LecturerDashboardService } from '../services/lecturer-dashboard.service.js';
import type { LecturerDashboardOverview } from '../types/lecturer-dashboard-overview.type.js';
import { LecturerDashboardController } from './lecturer-dashboard.controller.js';

describe('LecturerDashboardController', () => {
  let controller: LecturerDashboardController;
  let mockService: Partial<
    Record<keyof LecturerDashboardService, ReturnType<typeof vi.fn>>
  >;
  const lecturer = {
    id: 'lec-1',
    email: 'lec@school.edu.vn',
    role: Role.LECTURER,
  };

  beforeEach(() => {
    mockService = {
      getOverview: vi
        .fn()
        .mockResolvedValue({} as LecturerDashboardOverview),
    };
    controller = new LecturerDashboardController(
      mockService as unknown as LecturerDashboardService,
    );
  });

  it('forwards authenticated lecturer id and parses valid days', async () => {
    await controller.getOverview(lecturer, '30');
    expect(mockService.getOverview).toHaveBeenCalledWith(
      'lec-1',
      expect.any(Date),
      30,
    );
  });

  it('passes undefined when days is omitted or non-numeric', async () => {
    await controller.getOverview(lecturer);
    await controller.getOverview(lecturer, '7abc');
    expect(mockService.getOverview).toHaveBeenNthCalledWith(
      1,
      'lec-1',
      expect.any(Date),
      undefined,
    );
    expect(mockService.getOverview).toHaveBeenNthCalledWith(
      2,
      'lec-1',
      expect.any(Date),
      undefined,
    );
  });
});
