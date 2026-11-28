import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminStatsService } from '../services/admin-stats.service.js';
import type { AdminDashboardOverview } from '../types/admin-dashboard-overview.type.js';
import { AdminStatsController } from './admin-stats.controller.js';

describe('AdminStatsController', () => {
  let controller: AdminStatsController;
  let mockService: Partial<
    Record<keyof AdminStatsService, ReturnType<typeof vi.fn>>
  >;

  beforeEach(() => {
    mockService = {
      getOverview: vi.fn().mockResolvedValue({} as AdminDashboardOverview),
    };
    controller = new AdminStatsController(
      mockService as unknown as AdminStatsService,
    );
  });

  it('returns overview from AdminStatsService', async () => {
    await controller.getOverview();
    expect(mockService.getOverview).toHaveBeenCalledTimes(1);
    expect(mockService.getOverview).toHaveBeenCalledWith(
      expect.any(Date),
      undefined,
    );
  });

  it('forwards a numeric days query to the service', async () => {
    await controller.getOverview('30');
    expect(mockService.getOverview).toHaveBeenCalledWith(expect.any(Date), 30);
  });

  it('ignores non-numeric or partially numeric days query', async () => {
    await controller.getOverview('abc');
    await controller.getOverview('7abc');
    expect(mockService.getOverview).toHaveBeenNthCalledWith(
      1,
      expect.any(Date),
      undefined,
    );
    expect(mockService.getOverview).toHaveBeenNthCalledWith(
      2,
      expect.any(Date),
      undefined,
    );
  });
});
