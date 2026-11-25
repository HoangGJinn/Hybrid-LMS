import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { dashboardService } from '../api/dashboard.service';
import type { TrendDays } from '../types/dashboard.types';

export const DASHBOARD_REFRESH_SECONDS = 30;

export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: (days: TrendDays) =>
    [...dashboardKeys.all, 'overview', days] as const,
};

/** `days` is the trend window; the previous data stays visible while a new window loads. */
export const useDashboardOverview = (days: TrendDays = 14) =>
  useQuery({
    queryKey: dashboardKeys.overview(days),
    queryFn: () => dashboardService.getOverview(days),
    refetchInterval: DASHBOARD_REFRESH_SECONDS * 1000,
    placeholderData: keepPreviousData,
  });
