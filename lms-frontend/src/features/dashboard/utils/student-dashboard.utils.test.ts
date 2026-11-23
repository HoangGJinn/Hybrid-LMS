import { describe, expect, it } from 'vitest';
import type { StudentUpcomingWorkItem } from '../types/student-dashboard.types';
import {
  filterUpcomingWork,
  formatWorkDeadline,
  scoreToneClass,
  sliceAttentionClasses,
} from './student-dashboard.utils';

describe('student-dashboard.utils', () => {
  it('caps attention classes at 3 and reports overflow count', () => {
    const classes = [
      { id: '1', code: 'CS101', name: 'Intro' },
      { id: '2', code: 'CS102', name: 'DS' },
      { id: '3', code: 'CS103', name: 'DB' },
      { id: '4', code: 'CS104', name: 'AI' },
    ];
    expect(sliceAttentionClasses(classes)).toEqual({
      visible: classes.slice(0, 3),
      moreCount: 1,
    });
    expect(sliceAttentionClasses(undefined)).toEqual({
      visible: [],
      moreCount: 0,
    });
  });

  it('filters upcoming work items by ALL, EXAM, or ASSIGNMENT', () => {
    const items: StudentUpcomingWorkItem[] = [
      {
        id: 'e1',
        itemId: 'e1',
        type: 'EXAM',
        status: 'LIVE',
        title: 'Midterm',
        classId: 'c1',
        classCode: 'CS101',
        className: 'CS',
        startAt: null,
        dueAt: '2026-11-23T14:00:00Z',
        submissionType: null,
        durationMinutes: 60,
        link: '/student/courses/c1/exams/e1',
      },
      {
        id: 'a1',
        itemId: 'si1',
        type: 'ASSIGNMENT',
        status: 'OPEN',
        title: 'Lab 1',
        classId: 'c1',
        classCode: 'CS101',
        className: 'CS',
        startAt: null,
        dueAt: '2026-11-25T12:00:00Z',
        submissionType: 'FILE',
        durationMinutes: null,
        link: '/student/courses/c1/assignments/a1',
      },
    ];

    expect(filterUpcomingWork(items, 'ALL')).toHaveLength(2);
    expect(filterUpcomingWork(items, 'EXAM').map((i) => i.id)).toEqual(['e1']);
    expect(filterUpcomingWork(items, 'ASSIGNMENT').map((i) => i.id)).toEqual([
      'a1',
    ]);
  });

  it('formats live, overdue, upcoming and due countdowns cleanly', () => {
    const nowMs = new Date('2026-11-23T12:00:00Z').getTime();
    expect(formatWorkDeadline('2026-11-23T13:00:00Z', 'LIVE', nowMs)).toBe(
      'Live now',
    );
    expect(formatWorkDeadline('2026-11-21T12:00:00Z', 'OVERDUE', nowMs)).toBe(
      'Overdue 2d',
    );
    expect(formatWorkDeadline('2026-11-23T17:00:00Z', 'UPCOMING', nowMs)).toBe(
      'Starts in 5h',
    );
    expect(formatWorkDeadline('2026-11-25T12:00:00Z', 'DUE_SOON', nowMs)).toBe(
      'Due in 2d',
    );
  });

  it('returns semantic tone classes for scores', () => {
    expect(scoreToneClass(4.5)).toBe('text-destructive');
    expect(scoreToneClass(6.0)).toBe('text-warning');
    expect(scoreToneClass(8.5)).toBe('text-foreground');
  });
});
