export type CalendarEventKind = 'ASSIGNMENT' | 'EXAM' | 'REVIEW';

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  title: string;
  /** Course code, when the event belongs to a course. */
  context: string | null;
  /** ISO date-time used to place the event on the grid. */
  at: string;
  href: string;
}
