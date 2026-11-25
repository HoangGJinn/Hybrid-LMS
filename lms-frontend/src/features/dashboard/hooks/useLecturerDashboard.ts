import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { lecturerDashboardService } from '../api/lecturer-dashboard.service';
import type { LecturerTrendDays } from '../types/lecturer-dashboard.types';

export const LECTURER_DASHBOARD_REFRESH_SECONDS = 60;

export const lecturerDashboardKeys = {
  all: ['lecturer-dashboard'] as const,
  overview: (days: LecturerTrendDays) =>
    [...lecturerDashboardKeys.all, 'overview', days] as const,
};

/** Aggregated lecturer overview with silent background refresh every 60s. */
export const useLecturerDashboard = (days: LecturerTrendDays = 14) =>
  useQuery({
    queryKey: lecturerDashboardKeys.overview(days),
    queryFn: () => lecturerDashboardService.getOverview(days),
    placeholderData: keepPreviousData,
    refetchInterval: LECTURER_DASHBOARD_REFRESH_SECONDS * 1000,
  });
