import type {
  StudentAttentionClassRef,
  StudentUpcomingWorkItem,
  StudentWorkItemStatus,
} from '../types/student-dashboard.types';

export type StudentWorkFilter = 'ALL' | 'EXAM' | 'ASSIGNMENT';

export const MAX_VISIBLE_ATTENTION_CLASSES = 3;

export const sliceAttentionClasses = (
  classes: StudentAttentionClassRef[] | undefined,
): { visible: StudentAttentionClassRef[]; moreCount: number } => {
  if (!classes || classes.length === 0) {
    return { visible: [], moreCount: 0 };
  }
  const visible = classes.slice(0, MAX_VISIBLE_ATTENTION_CLASSES);
  return {
    visible,
    moreCount: Math.max(0, classes.length - visible.length),
  };
};

export const filterUpcomingWork = (
  items: StudentUpcomingWorkItem[],
  filter: StudentWorkFilter,
): StudentUpcomingWorkItem[] =>
  filter === 'ALL' ? items : items.filter((item) => item.type === filter);

/** Compact deadline label relative to `nowMs`. */
export const formatWorkDeadline = (
  dueAt: string,
  status: StudentWorkItemStatus,
  nowMs: number,
): string => {
  if (status === 'LIVE') return 'Live now';
  const ts = new Date(dueAt).getTime();
  if (Number.isNaN(ts)) return '—';

  const diffMs = ts - nowMs;
  const absHours = Math.floor(Math.abs(diffMs) / (60 * 60 * 1000));
  const absDays = Math.floor(absHours / 24);

  if (diffMs < 0) {
    if (absHours < 1) return 'Overdue <1h';
    if (absHours < 24) return `Overdue ${absHours}h`;
    return `Overdue ${absDays}d`;
  }

  if (status === 'UPCOMING') {
    if (absHours < 1) return 'Starts <1h';
    if (absHours < 24) return `Starts in ${absHours}h`;
    return `Starts in ${absDays}d`;
  }

  if (absHours < 1) return 'Due <1h';
  if (absHours < 24) return `Due in ${absHours}h`;
  return `Due in ${absDays}d`;
};

export const scoreToneClass = (score: number): string => {
  if (score < 5) return 'text-destructive';
  if (score < 6.5) return 'text-warning';
  return 'text-foreground';
};
