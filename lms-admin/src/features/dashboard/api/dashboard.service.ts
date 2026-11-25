import { get } from '@/core/api/http';
import type { AdminDashboardOverview, TrendDays } from '../types/dashboard.types';

export const dashboardService = {
  getOverview: (days: TrendDays): Promise<AdminDashboardOverview> =>
    get<AdminDashboardOverview>('/api/admin/stats/overview', { days }),
};
