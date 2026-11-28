import { describe, expect, it, vi } from 'vitest';
import type { MonitoringService } from '../services/monitoring.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('delegates readiness check to MonitoringService', async () => {
    const payload = {
      status: 'ok' as const,
      uptimeSeconds: 120,
      timestamp: '2026-11-24T10:00:00.000Z',
    };
    const service = {
      checkHealth: vi.fn().mockResolvedValue(payload),
    } as unknown as MonitoringService;

    const controller = new HealthController(service);
    await expect(controller.check()).resolves.toEqual(payload);
    expect(service.checkHealth).toHaveBeenCalledTimes(1);
  });
});
