import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { studentDashboardService } from '../api/student-dashboard.service';
import type { StudentDashboardDays } from '../types/student-dashboard.types';

export const STUDENT_DASHBOARD_REFRESH_SECONDS = 30;

export const studentDashboardKeys = {
  all: ['student-dashboard'] as const,
  overview: (days: StudentDashboardDays) =>
    [...studentDashboardKeys.all, 'overview', days] as const,
};

/** Aggregated student dashboard overview with silent background refresh every 30s. */
export const useStudentDashboard = (days: StudentDashboardDays = 14) =>
  useQuery({
    queryKey: studentDashboardKeys.overview(days),
    queryFn: () => studentDashboardService.getOverview(days),
    placeholderData: keepPreviousData,
    staleTime: STUDENT_DASHBOARD_REFRESH_SECONDS * 1000,
    refetchInterval: STUDENT_DASHBOARD_REFRESH_SECONDS * 1000,
  });
