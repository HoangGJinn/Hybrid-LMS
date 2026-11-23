import type { AdminDashboardOverview } from '../types/dashboard.types';

export type Severity = 'error' | 'warning' | 'ok';

export interface Issue {
  key: string;
  severity: Severity;
  text: string;
  to?: string;
  action?: string;
  /** Up to MAX_VISIBLE_LINKS class code chips. */
  links?: { label: string; to: string }[];
  moreCount?: number;
}

export const MAX_VISIBLE_LINKS = 3;

const ORDER: Record<Severity, number> = { error: 0, warning: 1, ok: 2 };

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const buildIssues = (overview: AdminDashboardOverview): Issue[] => {
  const { attention, traffic } = overview;

  const blocked = attention.classesWithInactiveLecturer;
  const blockedCount =
    attention.classesWithInactiveLecturerCount ?? blocked.length;
  const visibleBlocked = blocked.slice(0, MAX_VISIBLE_LINKS);

  const lecturerCheck: Issue =
    blockedCount > 0
      ? {
          key: 'lecturer-unavailable',
          severity: 'error',
          text: `${blockedCount} active ${plural(blockedCount, 'course has', 'courses have')} an unavailable lecturer`,
          to: '/courses',
          action: 'Reassign',
          links: visibleBlocked.map((c) => ({
            label: c.classCode,
            to: `/courses/${c.id}`,
          })),
          moreCount: Math.max(0, blockedCount - visibleBlocked.length),
        }
      : {
          key: 'lecturer-unavailable',
          severity: 'ok',
          text: 'Lecturer availability — all active courses covered',
        };

  const securityCheck: Issue =
    traffic.failedLogins24hCount > 0
      ? {
          key: 'security',
          severity: 'error',
          text: `${traffic.failedLogins24hCount} failed or blocked sign-in ${plural(traffic.failedLogins24hCount, 'event', 'events')} in the last 24h`,
          to: '/audit-logs?category=SECURITY&result=FAILURE',
          action: 'Inspect',
        }
      : {
          key: 'security',
          severity: 'ok',
          text: 'Security 24h — no failed or blocked sign-ins',
        };

  const empty = attention.emptyActiveClasses;
  const emptyCount = attention.emptyActiveClassesCount ?? empty.length;
  const visibleEmpty = empty.slice(0, MAX_VISIBLE_LINKS);

  const enrolmentCheck: Issue =
    emptyCount > 0
      ? {
          key: 'empty-classes',
          severity: 'warning',
          text: `${emptyCount} active ${plural(emptyCount, 'course has', 'courses have')} no students enrolled`,
          to: '/courses',
          action: 'Open courses',
          links: visibleEmpty.map((c) => ({
            label: c.classCode,
            to: `/courses/${c.id}/participants`,
          })),
          moreCount: Math.max(0, emptyCount - visibleEmpty.length),
        }
      : {
          key: 'empty-classes',
          severity: 'ok',
          text: 'Enrolment — every active course has students',
        };

  return [lecturerCheck, securityCheck, enrolmentCheck].sort(
    (a, b) => ORDER[a.severity] - ORDER[b.severity],
  );
};
