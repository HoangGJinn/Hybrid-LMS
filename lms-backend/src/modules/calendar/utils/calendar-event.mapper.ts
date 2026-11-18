import type { ClassView } from '../../academic/index.js';
import { AssignmentStatus } from '../../assignment/index.js';
import type { AssignmentSummary } from '../../assignment/index.js';
import type { StudentExamSummaryView } from '../../exam/index.js';
import { CalendarEventType } from '../types/calendar-event-view.type.js';
import type { CalendarEventView } from '../types/calendar-event-view.type.js';

/** Half-open range `[from, to)` on `occursAt`; a missing bound leaves that side open. */
export interface CalendarRange {
  readonly from?: Date;
  readonly to?: Date;
}

const DONE_ASSIGNMENT_STATUSES: readonly AssignmentStatus[] = [
  AssignmentStatus.SUBMITTED,
  AssignmentStatus.GRADED,
];

/** An assignment sits on its deadline: that is the day a student plans around. */
export const toAssignmentEvent = (
  assignment: AssignmentSummary,
  classRoom: ClassView | undefined,
): CalendarEventView => ({
  id: `${CalendarEventType.ASSIGNMENT}:${assignment.id}`,
  type: CalendarEventType.ASSIGNMENT,
  sourceId: assignment.id,
  title: assignment.title,
  classId: assignment.classId,
  classCode: classRoom?.classCode ?? '',
  className: classRoom?.name ?? '',
  occursAt: assignment.endAt,
  startAt: assignment.openAt,
  endAt: assignment.endAt,
  status: assignment.status,
  isDone: DONE_ASSIGNMENT_STATUSES.includes(assignment.status),
  durationMinutes: null,
});

/** An exam sits on its start time, because that is when the student has to show up. */
export const toExamEvent = (
  exam: StudentExamSummaryView,
  classRoom: ClassView | undefined,
): CalendarEventView => ({
  id: `${CalendarEventType.EXAM}:${exam.id}`,
  type: CalendarEventType.EXAM,
  sourceId: exam.id,
  title: exam.examName,
  classId: exam.classId,
  classCode: classRoom?.classCode ?? '',
  className: classRoom?.name ?? '',
  occursAt: exam.startTime,
  startAt: exam.startTime,
  endAt: exam.endTime,
  status: exam.status,
  isDone: exam.attemptsUsed > 0,
  durationMinutes: exam.durationMinutes,
});

export const isWithinRange = (
  moment: Date,
  { from, to }: CalendarRange,
): boolean =>
  (from === undefined || moment >= from) && (to === undefined || moment < to);

/** Earliest first; the id breaks ties so the order is stable between requests. */
export const compareEvents = (
  a: CalendarEventView,
  b: CalendarEventView,
): number =>
  a.occursAt.getTime() - b.occursAt.getTime() || a.id.localeCompare(b.id);