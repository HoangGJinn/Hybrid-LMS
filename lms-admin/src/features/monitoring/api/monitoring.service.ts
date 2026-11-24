import { get } from '@/core/api/http';
import type { SystemMonitoringOverview } from '../types/monitoring.types';

export const monitoringService = {
  getOverview: (refresh = false): Promise<SystemMonitoringOverview> =>
    get<SystemMonitoringOverview>(
      '/api/admin/monitoring/overview',
      refresh ? { refresh: 'true' } : undefined,
    ),
};
