import { describe, expect, it } from 'vitest';
import type { AdminDashboardOverview } from '../types/dashboard.types';
import { buildIssues } from './attention';

const makeOverview = (
  overrides: Partial<AdminDashboardOverview> = {},
): AdminDashboardOverview => ({
  classes: { activeCount: 5, endedCount: 1, currentSemesterCount: 5 },
  students: {
    totalCount: 50,
    studyingCount: 50,
    pendingCount: 0,
    inactiveCount: 0,
  },
  lecturers: {
    totalCount: 10,
    workingCount: 10,
    pendingCount: 0,
    inactiveCount: 0,
  },
  activeSemester: null,
  traffic: {
    onlineNowCount: 2,
    activeUsersTodayCount: 10,
    loginsTodayCount: 12,
    failedLogins24hCount: 0,
    onlineUsers: [],
  },
  attention: {
    emptyActiveClasses: [],
    emptyActiveClassesCount: 0,
    classesWithInactiveLecturer: [],
    classesWithInactiveLecturerCount: 0,
  },
  subjectDistribution: [],
  trends: { days: 14, loginsByDay: [], activityByHour: [] },
  ...overrides,
});

describe('buildIssues', () => {
  it('always returns all 3 monitored checks marked ok when healthy', () => {
    const checks = buildIssues(makeOverview());
    expect(checks).toHaveLength(3);
    expect(checks.every((c) => c.severity === 'ok')).toBe(true);
    expect(checks.map((c) => c.key)).toEqual([
      'lecturer-unavailable',
      'security',
      'empty-classes',
    ]);
  });

  it('orders active issues above healthy checks (error -> warning -> ok)', () => {
    const checks = buildIssues(
      makeOverview({
        traffic: {
          onlineNowCount: 0,
          activeUsersTodayCount: 0,
          loginsTodayCount: 0,
          failedLogins24hCount: 3,
          onlineUsers: [],
        },
        attention: {
          emptyActiveClasses: [
            { id: 'c1', classCode: 'CS101', name: 'Intro', lecturerName: 'L1' },
          ],
          emptyActiveClassesCount: 1,
          classesWithInactiveLecturer: [],
          classesWithInactiveLecturerCount: 0,
        },
      }),
    );

    expect(checks.map((c) => c.key)).toEqual([
      'security',
      'empty-classes',
      'lecturer-unavailable',
    ]);
    expect(checks.map((c) => c.severity)).toEqual(['error', 'warning', 'ok']);
  });

  it('caps class code chips at 3 and computes remaining moreCount', () => {
    const checks = buildIssues(
      makeOverview({
        attention: {
          emptyActiveClasses: [
            { id: 'c1', classCode: 'CS101', name: 'C1', lecturerName: 'L1' },
            { id: 'c2', classCode: 'CS102', name: 'C2', lecturerName: 'L1' },
            { id: 'c3', classCode: 'CS103', name: 'C3', lecturerName: 'L1' },
            { id: 'c4', classCode: 'CS104', name: 'C4', lecturerName: 'L1' },
            { id: 'c5', classCode: 'CS105', name: 'C5', lecturerName: 'L1' },
          ],
          emptyActiveClassesCount: 9,
          classesWithInactiveLecturer: [],
          classesWithInactiveLecturerCount: 0,
        },
      }),
    );

    const enrolment = checks.find((c) => c.key === 'empty-classes')!;
    expect(enrolment.severity).toBe('warning');
    expect(enrolment.text).toBe('9 active courses have no students enrolled');
    expect(enrolment.links).toHaveLength(3);
    expect(enrolment.moreCount).toBe(6);
  });
});
