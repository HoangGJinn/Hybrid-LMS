import { pad } from '@shared/utils/format';
import type {
  CalendarApiEvent,
  CalendarEvent,
  CalendarKindFilter,
  CalendarRange,
} from '../types/calendar.types';

/** Local-time YYYY-MM-DD key (not UTC), so an event lands on the day the user sees. */
export const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const startOfMonth = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), 1);

export const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const addMonths = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

export const isSameMonth = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const GRID_CELLS = 42;

/** 6 weeks x 7 days = 42 cells covering the month, starting on Monday by default. */
export const buildMonthGrid = (
  month: Date,
  weekStartsOn: 0 | 1 = 1,
): Date[] => {
  const first = startOfMonth(month);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  return Array.from(
    { length: GRID_CELLS },
    (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + i),
  );
};

/** Everything the grid can show, including the days of the neighbouring months that fill its first and last weeks. */
export const getVisibleRange = (
  month: Date,
  weekStartsOn: 0 | 1 = 1,
): CalendarRange => {
  const cells = buildMonthGrid(month, weekStartsOn);
  return {
    from: cells[0].toISOString(),
    to: addDays(cells[GRID_CELLS - 1], 1).toISOString(),
  };
};

export const weekdayLabels = (weekStartsOn: 0 | 1 = 1): string[] => {
  const all = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return [...all.slice(weekStartsOn), ...all.slice(0, weekStartsOn)];
};

export const toCalendarEvent = (event: CalendarApiEvent): CalendarEvent => ({
  id: event.id,
  kind: event.type,
  title: event.title,
  context: event.classCode || null,
  at: event.occursAt,
  endAt: event.type === 'EXAM' ? event.endAt : null,
  href:
    event.type === 'ASSIGNMENT'
      ? `/student/courses/${event.classId}/assignments/${event.sourceId}`
      : `/student/courses/${event.classId}/exams/${event.sourceId}`,
  status: event.status,
  isDone: event.isDone,
  durationMinutes: event.durationMinutes,
});

export const toCalendarEvents = (events: CalendarApiEvent[]): CalendarEvent[] =>
  events.map(toCalendarEvent);

export const sortByTime = (events: CalendarEvent[]): CalendarEvent[] =>
  [...events].sort((a, b) => +new Date(a.at) - +new Date(b.at));

/** Events of the chosen kind grouped by the local day they fall on. */
export const groupByDay = (
  events: CalendarEvent[],
  filter: CalendarKindFilter = 'ALL',
): Map<string, CalendarEvent[]> => {
  const byDay = new Map<string, CalendarEvent[]>();
  events
    .filter((event) => filter === 'ALL' || event.kind === filter)
    .forEach((event) => {
      const key = dateKey(new Date(event.at));
      byDay.set(key, [...(byDay.get(key) ?? []), event]);
    });
  return byDay;
};

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});
const dayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

export const formatTime = (iso: string): string =>
  timeFormatter.format(new Date(iso));

/** One line saying when: a deadline for an assignment, a time window for an exam. */
export const describeEventTime = (
  event: CalendarEvent,
  withDate = false,
): string => {
  const day = withDate ? `${dayFormatter.format(new Date(event.at))}, ` : '';
  if (event.kind === 'ASSIGNMENT') return `Due ${day}${formatTime(event.at)}`;
  if (event.kind === 'EXAM' && event.endAt) {
    const duration = event.durationMinutes
      ? ` (${event.durationMinutes} min)`
      : '';
    return `${day}${formatTime(event.at)} – ${formatTime(event.endAt)}${duration}`;
  }
  return `${day}${formatTime(event.at)}`;
};