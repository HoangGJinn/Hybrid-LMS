export type DashboardStatKey = 'classes' | 'students' | 'lecturers' | 'semester';

export interface DashboardStat {
  key: DashboardStatKey;
  label: string;
  /** `null` until real data is wired in. */
  value: string | number | null;
}

const PLACEHOLDER_STATS: DashboardStat[] = [
  { key: 'classes', label: 'Active classes', value: null },
  { key: 'students', label: 'Students', value: null },
  { key: 'lecturers', label: 'Lecturers', value: null },
  { key: 'semester', label: 'Current semester', value: null },
];

/**
 * PLACEHOLDER. Returns empty stats so the dashboard layout can be built now.
 * When the backend ships `GET /api/admin/stats/overview`
 * (`{ totalClasses, totalStudents, totalLecturers, activeSemester }`), replace the body with a
 * `useQuery` and map the response onto `DashboardStat[]`; DashboardPage needs no change.
 */
export const useDashboardStats = () => ({
  isPlaceholder: true as const,
  stats: PLACEHOLDER_STATS,
});
