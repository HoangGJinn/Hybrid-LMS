import { describe, expect, it, vi } from 'vitest';
import type { MonitoringService } from '../services/monitoring.service.js';
import type { SystemMonitoringOverview } from '../types/monitoring-overview.type.js';
import { MonitoringController } from './monitoring.controller.js';

describe('MonitoringController', () => {
  it('forwards refresh flag only when query param equals "true"', async () => {
    const service = {
      getOverview: vi.fn().mockResolvedValue({} as SystemMonitoringOverview),
    } as unknown as MonitoringService;
    const controller = new MonitoringController(service);

    await controller.getOverview();
    await controller.getOverview('false');
    await controller.getOverview('true');

    expect(service.getOverview).toHaveBeenNthCalledWith(1, false);
    expect(service.getOverview).toHaveBeenNthCalledWith(2, false);
    expect(service.getOverview).toHaveBeenNthCalledWith(3, true);
  });
});
