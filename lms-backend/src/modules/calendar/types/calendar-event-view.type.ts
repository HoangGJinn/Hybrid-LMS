import type { AssignmentStatus } from '../../assignment/index.js';
import type { ExamStatus } from '../../exam/index.js';

export enum CalendarEventType {
  ASSIGNMENT = 'ASSIGNMENT',
  EXAM = 'EXAM',
}

/** Item in `GET /api/calendar/me`: one assignment deadline or one exam of the student's classes. */
export interface CalendarEventView {
  /** Unique across types, e.g. `ASSIGNMENT:<uuid>`; safe to use as a React key. */
  readonly id: string;
  readonly type: CalendarEventType;
  /** Id of the assignment or exam this event comes from. */
  readonly sourceId: string;
  readonly title: string;
  readonly classId: string;
  readonly classCode: string;
  readonly className: string;
  /** The moment the event sits on the calendar: the deadline of an assignment, the start of an exam. */
  readonly occursAt: Date;
  /** When the assignment opens for submissions, or when the exam starts. */
  readonly startAt: Date;
  /** The assignment deadline, or when the exam closes. */
  readonly endAt: Date;
  /** Status for the student: assignment or exam status, depending on `type`. */
  readonly status: AssignmentStatus | ExamStatus;
  /** True once the student has nothing left to do: submitted/graded assignment, or an exam with an attempt. */
  readonly isDone: boolean;
  /** Length of one attempt in minutes; null for assignments. */
  readonly durationMinutes: number | null;
}