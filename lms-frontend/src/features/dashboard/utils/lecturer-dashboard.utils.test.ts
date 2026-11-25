import { describe, expect, it } from 'vitest';
import type { LecturerDashboardOverview } from '../types/lecturer-dashboard.types';
import {
  buildLecturerAttentionChecks,
  formatRelativeAge,
  formatShortDate,
  niceChartMax,
} from './lecturer-dashboard.utils';

const makeOverview = (
  overrides: Partial<LecturerDashboardOverview> = {},
): LecturerDashboardOverview => ({
  summary: {
    activeClassCount: 3,
    endedClassCount: 0,
    totalStudents: 90,
    activeStudents7dCount: 70,
    pendingGradingCount: 0,
    pendingExamsCount: 0,
    pendingAssignmentsCount: 0,
    oldestPendingSubmittedAt: null,
    overdueGrading48hCount: 0,
    submissionRatePercent: 80,
    submittedCount: 80,
    expectedSubmissionCount: 100,
    upcoming7dCount: 2,
    upcomingExams7dCount: 1,
    upcomingAssignments7dCount: 1,
    liveExamsCount: 0,
  },
  attention: {
    overdueGrading48hCount: 0,
    lowSubmissionAssignments: [],
    lowSubmissionAssignmentsCount: 0,
    unconfiguredClasses: [],
    unconfiguredClassesCount: 0,
  },
  trends: { days: 14, submissionsByDay: [] },
  upcomingEvents: [],
  classes: [],
  gradingQueue: [],
  scoreDistribution: { overall: [], byClass: {} },
  atRiskStudents: [],
  ...overrides,
});

describe('lecturer-dashboard utilities', () => {
  it('returns 3 healthy ok checks when there are no issues', () => {
    const checks = buildLecturerAttentionChecks(makeOverview());
    expect(checks).toHaveLength(3);
    expect(checks.every((c) => c.severity === 'ok')).toBe(true);
  });

  it('orders active error and warning checks before healthy checks and caps links at 3', () => {
    const base = makeOverview();
    const checks = buildLecturerAttentionChecks({
      ...base,
      summary: { ...base.summary, pendingGradingCount: 5 },
      attention: {
        overdueGrading48hCount: 2,
        lowSubmissionAssignments: [
          {
            assignmentId: 'a1',
            classId: 'c1',
            classCode: 'CS101',
            title: 'Lab 1',
            endAt: '2026-11-24T00:00:00Z',
            submittedCount: 3,
            studentCount: 30,
          },
          {
            assignmentId: 'a2',
            classId: 'c2',
            classCode: 'CS102',
            title: 'Lab 2',
            endAt: '2026-11-24T00:00:00Z',
            submittedCount: 4,
            studentCount: 30,
          },
          {
            assignmentId: 'a3',
            classId: 'c3',
            classCode: 'CS103',
            title: 'Lab 3',
            endAt: '2026-11-24T00:00:00Z',
            submittedCount: 1,
            studentCount: 30,
          },
          {
            assignmentId: 'a4',
            classId: 'c4',
            classCode: 'CS104',
            title: 'Lab 4',
            endAt: '2026-11-24T00:00:00Z',
            submittedCount: 2,
            studentCount: 30,
          },
        ],
        lowSubmissionAssignmentsCount: 5,
        unconfiguredClasses: [],
        unconfiguredClassesCount: 0,
      },
    });

    expect(checks.map((c) => c.severity)).toEqual(['error', 'warning', 'ok']);
    const low = checks.find((c) => c.key === 'low-submissions')!;
    expect(low.links).toHaveLength(3);
    expect(low.moreCount).toBe(2);
  });

  it('produces even integer chart ceilings and formats dates and ages', () => {
    for (const v of [1, 3, 5, 7, 11, 25, 47]) {
      const ceiling = niceChartMax(v);
      expect(ceiling).toBeGreaterThanOrEqual(v);
      expect(ceiling % 2).toBe(0);
    }
    expect(formatShortDate('2026-11-08')).toBe('08/11');
    const now = new Date('2026-11-23T12:00:00Z').getTime();
    expect(formatRelativeAge('2026-11-21T12:00:00Z', now)).toBe('2d ago');
    expect(formatRelativeAge('2026-11-23T09:00:00Z', now)).toBe('3h ago');
    expect(formatRelativeAge(null, now)).toBe('—');
  });
});
