import { USE_MOCK } from '@core/config/env';
import {
  delay,
  mockAssignments,
  mockClasses,
  mockExamSchedules,
} from '@core/mocks';
import { get } from '@core/api/http';
import type {
  CalendarApiEvent,
  CalendarEventStatus,
  CalendarRange,
} from '../types/calendar.types';

const MS_PER_MINUTE = 60_000;

const resolveExamStatus = (
  startTime: string,
  endTime: string,
): CalendarEventStatus => {
  const now = Date.now();
  if (now < new Date(startTime).getTime()) return 'UPCOMING';
  return now < new Date(endTime).getTime() ? 'OPEN' : 'CLOSED';
};

const buildMockEvents = (): CalendarApiEvent[] => {
  const classOf = (classId: string) =>
    mockClasses.find((classRoom) => classRoom.id === classId);
  return [
    ...mockAssignments.map((assignment): CalendarApiEvent => ({
      id: `ASSIGNMENT:${assignment.id}`,
      type: 'ASSIGNMENT',
      sourceId: assignment.id,
      title: assignment.title,
      classId: assignment.classId,
      classCode: classOf(assignment.classId)?.classCode ?? '',
      className: classOf(assignment.classId)?.name ?? '',
      occursAt: assignment.endAt,
      startAt: assignment.openAt,
      endAt: assignment.endAt,
      status: assignment.status,
      isDone:
        assignment.status === 'SUBMITTED' || assignment.status === 'GRADED',
      durationMinutes: null,
    })),
    ...mockExamSchedules.map((exam): CalendarApiEvent => ({
      id: `EXAM:${exam.id}`,
      type: 'EXAM',
      sourceId: exam.id,
      title: exam.examName,
      classId: exam.classId,
      classCode: classOf(exam.classId)?.classCode ?? '',
      className: classOf(exam.classId)?.name ?? '',
      occursAt: exam.startTime,
      startAt: exam.startTime,
      endAt: exam.endTime,
      status: resolveExamStatus(exam.startTime, exam.endTime),
      isDone: false,
      durationMinutes: Math.round(
        (new Date(exam.endTime).getTime() -
          new Date(exam.startTime).getTime()) /
          MS_PER_MINUTE,
      ),
    })),
  ];
};

/** Same rule as the backend: `from` is inclusive, `to` is exclusive. */
const isInRange = (event: CalendarApiEvent, { from, to }: CalendarRange) => {
  const occursAt = new Date(event.occursAt).getTime();
  return (
    occursAt >= new Date(from).getTime() && occursAt < new Date(to).getTime()
  );
};

export const calendarService = {
  /** Assignment deadlines and exams of the signed-in student's classes inside the range, earliest first. */
  getMyEvents: (range: CalendarRange): Promise<CalendarApiEvent[]> => {
    if (!USE_MOCK) return get('/api/calendar/me', range);
    return delay(
      buildMockEvents()
        .filter((event) => isInRange(event, range))
        .sort((a, b) => a.occursAt.localeCompare(b.occursAt)),
    );
  },
};