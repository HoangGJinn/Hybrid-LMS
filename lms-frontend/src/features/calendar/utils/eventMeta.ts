import type {
  CalendarEvent,
  CalendarEventKind,
  CalendarEventStatus,
} from '../types/calendar.types';

interface Badge {
  label: string;
  className: string;
}

export const KIND_META: Record<
  CalendarEventKind,
  { label: string; chip: string; dot: string }
> = {
  ASSIGNMENT: {
    label: 'Assignment',
    chip: 'bg-primary/30 text-brand',
    dot: 'bg-primary',
  },
  EXAM: {
    label: 'Exam',
    chip: 'bg-destructive/15 text-destructive',
    dot: 'bg-destructive',
  },
  REVIEW: {
    label: 'Review',
    chip: 'bg-warning/25 text-foreground',
    dot: 'bg-warning',
  },
};

const NEUTRAL = 'bg-muted text-muted-foreground';
const DONE = 'bg-success/20 text-foreground';
const DANGER = 'bg-destructive/15 text-destructive';

const STATUS_BADGES: Record<CalendarEventStatus, Badge> = {
  UPCOMING: { label: 'Upcoming', className: NEUTRAL },
  OPEN: { label: 'Open', className: 'bg-primary/20 text-brand' },
  SUBMITTED: { label: 'Submitted', className: DONE },
  GRADED: { label: 'Graded', className: DONE },
  OVERDUE: { label: 'Overdue', className: DANGER },
  CLOSED: { label: 'Closed', className: NEUTRAL },
};

/** A closed exam nobody attempted was missed, and an attempted one is done whatever its window says. */
export const getStatusBadge = (event: CalendarEvent): Badge | null => {
  if (event.status === null) return null;
  if (event.kind === 'EXAM' && event.isDone) {
    return { label: 'Attempted', className: DONE };
  }
  if (event.kind === 'EXAM' && event.status === 'CLOSED') {
    return { label: 'Missed', className: DANGER };
  }
  return STATUS_BADGES[event.status];
};

/** Overdue work stands out on the grid; finished work fades. */
export const getChipClassName = (event: CalendarEvent): string =>
  event.status === 'OVERDUE' && !event.isDone
    ? DANGER
    : KIND_META[event.kind].chip;