export type CalendarEventKind = 'ASSIGNMENT' | 'EXAM' | 'REVIEW';

/** Where an assignment or an exam stands for the signed-in student. Reviews have no status. */
export type CalendarEventStatus =
  'UPCOMING' | 'OPEN' | 'SUBMITTED' | 'GRADED' | 'OVERDUE' | 'CLOSED';

/** Item of `GET /api/calendar/me`: one assignment deadline or one exam. */
export interface CalendarApiEvent {
  id: string;
  type: Exclude<CalendarEventKind, 'REVIEW'>;
  /** Id of the assignment or exam behind the event. */
  sourceId: string;
  title: string;
  classId: string;
  classCode: string;
  className: string;
  /** Where the event sits on the grid: the deadline of an assignment, the start of an exam. */
  occursAt: string;
  startAt: string;
  endAt: string;
  status: CalendarEventStatus;
  /** Nothing left to do: submitted or graded assignment, or an exam with an attempt. */
  isDone: boolean;
  durationMinutes: number | null;
}

/** Half-open range `[from, to)` of ISO date-times, matched against `occursAt`. */
export interface CalendarRange {
  from: string;
  to: string;
}

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  title: string;
  /** Course code, when the event belongs to a course. */
  context: string | null;
  /** ISO date-time used to place the event on the grid. */
  at: string;
  /** End of an exam window; null when the event has no duration. */
  endAt: string | null;
  href: string;
  status: CalendarEventStatus | null;
  isDone: boolean;
  durationMinutes: number | null;
}

/** What the page shows: every kind, or just one. */
export type CalendarKindFilter = 'ALL' | CalendarEventKind;