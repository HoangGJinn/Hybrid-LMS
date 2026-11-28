import { describe, expect, it } from 'vitest';
import type { CalendarApiEvent, CalendarEvent } from '../types/calendar.types';
import {
  buildMonthGrid,
  dateKey,
  describeEventTime,
  getVisibleRange,
  groupByDay,
  toCalendarEvent,
} from './calendarUtils';

const buildApiEvent = (
  overrides: Partial<CalendarApiEvent> = {},
): CalendarApiEvent => ({
  id: 'ASSIGNMENT:a1',
  type: 'ASSIGNMENT',
  sourceId: 'a1',
  title: 'Lab 1',
  classId: 'c1',
  classCode: 'SE104.Q11',
  className: 'Software Engineering',
  occursAt: '2026-11-10T16:59:00.000Z',
  startAt: '2026-11-01T00:00:00.000Z',
  endAt: '2026-11-10T16:59:00.000Z',
  status: 'OPEN',
  isDone: false,
  durationMinutes: null,
  ...overrides,
});

const buildEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'ASSIGNMENT:a1',
  kind: 'ASSIGNMENT',
  title: 'Lab 1',
  context: null,
  at: new Date(2026, 10, 10, 23, 59).toISOString(),
  endAt: null,
  href: '/x',
  status: 'OPEN',
  isDone: false,
  durationMinutes: null,
  ...overrides,
});

describe('buildMonthGrid', () => {
  it('should return 42 consecutive days starting on a Monday', () => {
    const actualCells = buildMonthGrid(new Date(2026, 10, 18));

    expect(actualCells).toHaveLength(42);
    expect(actualCells[0].getDay()).toBe(1);
    expect(dateKey(actualCells[0])).toBe('2026-10-26');
    expect(dateKey(actualCells[41])).toBe('2026-12-06');
  });
});

describe('getVisibleRange', () => {
  it('should start at the first grid cell and end after the last one', () => {
    const actualRange = getVisibleRange(new Date(2026, 10, 18));

    expect(new Date(actualRange.from)).toEqual(new Date(2026, 9, 26));
    expect(new Date(actualRange.to)).toEqual(new Date(2026, 11, 7));
  });
});

describe('toCalendarEvent', () => {
  it('should link an assignment to its page in the class', () => {
    const actualEvent = toCalendarEvent(buildApiEvent());

    expect(actualEvent.kind).toBe('ASSIGNMENT');
    expect(actualEvent.href).toBe('/student/courses/c1/assignments/a1');
    expect(actualEvent.at).toBe('2026-11-10T16:59:00.000Z');
    expect(actualEvent.endAt).toBeNull();
    expect(actualEvent.context).toBe('SE104.Q11');
  });

  it('should keep the window of an exam and link to its page in the class', () => {
    const actualEvent = toCalendarEvent(
      buildApiEvent({
        id: 'EXAM:e1',
        type: 'EXAM',
        sourceId: 'e1',
        occursAt: '2026-11-05T01:00:00.000Z',
        endAt: '2026-11-05T02:30:00.000Z',
        durationMinutes: 60,
      }),
    );

    expect(actualEvent.href).toBe('/student/courses/c1/exams/e1');
    expect(actualEvent.endAt).toBe('2026-11-05T02:30:00.000Z');
    expect(actualEvent.durationMinutes).toBe(60);
  });

  it('should leave the context empty when the class code is unknown', () => {
    expect(
      toCalendarEvent(buildApiEvent({ classCode: '' })).context,
    ).toBeNull();
  });
});

describe('groupByDay', () => {
  const lateEvening = buildEvent({
    id: 'a',
    at: new Date(2026, 10, 10, 23, 59).toISOString(),
  });
  const exam = buildEvent({
    id: 'e',
    kind: 'EXAM',
    at: new Date(2026, 10, 10, 8, 0).toISOString(),
  });

  it('should group by the local day, not the UTC day', () => {
    const actualGroups = groupByDay([lateEvening, exam]);

    expect(actualGroups.get('2026-11-10')?.map((e) => e.id)).toEqual([
      'a',
      'e',
    ]);
  });

  it('should keep only the chosen kind', () => {
    const actualGroups = groupByDay([lateEvening, exam], 'EXAM');

    expect(actualGroups.get('2026-11-10')?.map((e) => e.id)).toEqual(['e']);
  });
});

describe('describeEventTime', () => {
  it('should describe an assignment as a deadline', () => {
    expect(describeEventTime(buildEvent())).toBe('Due 11:59 PM');
  });

  it('should describe an exam as a window with its length', () => {
    const exam = buildEvent({
      kind: 'EXAM',
      at: new Date(2026, 10, 5, 8, 0).toISOString(),
      endAt: new Date(2026, 10, 5, 9, 30).toISOString(),
      durationMinutes: 60,
    });

    expect(describeEventTime(exam)).toBe('8:00 AM – 9:30 AM (60 min)');
  });

  it('should add the date when asked', () => {
    expect(describeEventTime(buildEvent(), true)).toBe(
      'Due Tue, Nov 10, 11:59 PM',
    );
  });
});