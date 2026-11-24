import type { LecturerDashboardOverview } from '../types/lecturer-dashboard.types';

export type AttentionSeverity = 'error' | 'warning' | 'ok';

export interface LecturerAttentionCheck {
  key: string;
  severity: AttentionSeverity;
  text: string;
  to?: string;
  action?: string;
  links?: { label: string; to: string }[];
  moreCount?: number;
}

export const MAX_VISIBLE_LINKS = 3;

const SEVERITY_ORDER: Record<AttentionSeverity, number> = {
  error: 0,
  warning: 1,
  ok: 2,
};

const NICE_FACTORS = [1.2, 1.4, 1.6, 1.8, 2, 3, 4, 5, 6, 8, 10];

const plural = (n: number, one: string, many: string) =>
  n === 1 ? one : many;

/** Builds the 3 fixed monitoring checks sorted with active issues on top. */
export const buildLecturerAttentionChecks = (
  overview: LecturerDashboardOverview,
): LecturerAttentionCheck[] => {
  const { summary, attention } = overview;

  const backlogCheck: LecturerAttentionCheck =
    attention.overdueGrading48hCount > 0
      ? {
          key: 'grading-backlog',
          severity: 'error',
          text: `${attention.overdueGrading48hCount} ${plural(attention.overdueGrading48hCount, 'submission waiting', 'submissions waiting')} > 48h for a grade`,
          to: '/lecturer/grading',
          action: 'Open grading desk',
        }
      : summary.pendingGradingCount > 0
        ? {
            key: 'grading-backlog',
            severity: 'warning',
            text: `${summary.pendingGradingCount} ${plural(summary.pendingGradingCount, 'submission awaiting', 'submissions awaiting')} a grade`,
            to: '/lecturer/grading',
            action: 'Open grading desk',
          }
        : {
            key: 'grading-backlog',
            severity: 'ok',
            text: 'Grading backlog: 0 ungraded submissions',
          };

  const lowAssignments = attention.lowSubmissionAssignments;
  const visibleLow = lowAssignments.slice(0, MAX_VISIBLE_LINKS);
  const lowCheck: LecturerAttentionCheck =
    attention.lowSubmissionAssignmentsCount > 0
      ? {
          key: 'low-submissions',
          severity: 'warning',
          text: `${attention.lowSubmissionAssignmentsCount} ${plural(attention.lowSubmissionAssignmentsCount, 'assignment has', 'assignments have')} < 50% submissions`,
          links: visibleLow.map((a) => ({
            label: a.classCode,
            to: `/lecturer/classes/${a.classId}/assignments/${a.assignmentId}`,
          })),
          moreCount: Math.max(
            0,
            attention.lowSubmissionAssignmentsCount - visibleLow.length,
          ),
        }
      : {
          key: 'low-submissions',
          severity: 'ok',
          text: 'Submission rate: all due assignments ≥ 50%',
        };

  const unconfigured = attention.unconfiguredClasses;
  const visibleClasses = unconfigured.slice(0, MAX_VISIBLE_LINKS);
  const setupCheck: LecturerAttentionCheck =
    attention.unconfiguredClassesCount > 0
      ? {
          key: 'class-setup',
          severity: 'warning',
          text: `${attention.unconfiguredClassesCount} active ${plural(attention.unconfiguredClassesCount, 'class lacks', 'classes lack')} students or content`,
          links: visibleClasses.map((c) => ({
            label: c.classCode,
            to: `/lecturer/classes/${c.id}`,
          })),
          moreCount: Math.max(
            0,
            attention.unconfiguredClassesCount - visibleClasses.length,
          ),
        }
      : {
          key: 'class-setup',
          severity: 'ok',
          text: 'Class setup: all classes have students and content',
        };

  return [backlogCheck, lowCheck, setupCheck].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
};

/** Returns an even ceiling so [0, max/2, max] chart ticks are exact integers. */
export const niceChartMax = (value: number): number => {
  if (value <= 2) return 2;
  if (value <= 4) return 4;
  if (value <= 6) return 6;
  if (value <= 8) return 8;
  if (value <= 10) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const factor of NICE_FACTORS) {
    const candidate = Math.round(factor * magnitude);
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
};

/** Formats YYYY-MM-DD as DD/MM. */
export const formatShortDate = (iso: string): string => {
  const parts = iso.split('-');
  if (parts.length !== 3 || !parts[1] || !parts[2]) return iso;
  return `${parts[2]}/${parts[1]}`;
};

/** Compact age label relative to `nowMs`. */
export const formatRelativeAge = (
  iso: string | null | undefined,
  nowMs: number,
): string => {
  if (!iso) return '—';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '—';
  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};
