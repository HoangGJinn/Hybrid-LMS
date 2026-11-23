import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LecturerDashboardRepository } from '../repositories/lecturer-dashboard.repository.js';
import { LecturerDashboardService } from './lecturer-dashboard.service.js';

describe('LecturerDashboardService', () => {
  let service: LecturerDashboardService;
  let mockRepo: Partial<
    Record<keyof LecturerDashboardRepository, ReturnType<typeof vi.fn>>
  >;

  beforeEach(() => {
    mockRepo = {
      findClassesAndSummary: vi.fn().mockResolvedValue({
        activeClassCount: 3,
        endedClassCount: 1,
        totalStudents: 90,
        activeStudents7dCount: 64,
        submittedCount: 150,
        expectedSubmissionCount: 200,
        classes: [
          {
            id: 'c1',
            classCode: 'CS101',
            name: 'Intro',
            subjectCode: 'CS101',
            subjectName: 'CS',
            semesterCode: 'HK1-2026',
            studentCount: 30,
            activeStudents7dCount: 25,
            itemCount: 8,
            completionRatePercent: 80,
            submissionRatePercent: 75,
            avgScore: 8.2,
            pendingGradingCount: 2,
          },
          {
            id: 'c2',
            classCode: 'CS102',
            name: 'Empty Class',
            subjectCode: 'CS102',
            subjectName: 'DS',
            semesterCode: 'HK1-2026',
            studentCount: 0,
            activeStudents7dCount: 0,
            itemCount: 0,
            completionRatePercent: 0,
            submissionRatePercent: 0,
            avgScore: null,
            pendingGradingCount: 0,
          },
        ],
      }),
      findScheduleAndLowSubmissions: vi.fn().mockResolvedValue([
        {
          id: 'exam:e1',
          kind: 'exam',
          sourceId: 'e1',
          classId: 'c1',
          classCode: 'CS101',
          className: 'Intro',
          title: 'Midterm',
          startAt: new Date('2026-11-23T12:00:00Z'),
          endAt: new Date('2026-11-23T14:00:00Z'),
          durationMinutes: 60,
          isLive: true,
          submittedCount: 10,
          studentCount: 30,
        },
        {
          id: 'assignment:a1:c1',
          kind: 'assignment',
          sourceId: 'a1',
          classId: 'c1',
          classCode: 'CS101',
          className: 'Intro',
          title: 'Low Submission Lab',
          startAt: new Date('2026-11-20T00:00:00Z'),
          endAt: new Date('2026-11-24T12:00:00Z'),
          durationMinutes: null,
          isLive: true,
          submittedCount: 5,
          studentCount: 30,
        },
      ]),
      findGradingOverview: vi.fn().mockResolvedValue({
        pendingExamsCount: 4,
        pendingAssignmentsCount: 6,
        overdueGrading48hCount: 2,
        oldestPendingSubmittedAt: new Date('2026-11-20T09:00:00Z'),
        gradingQueue: [],
      }),
      findAnalyticsAndAtRisk: vi.fn().mockResolvedValue({
        trend: [{ date: '2026-11-23', submitted: 12, graded: 8 }],
        scoreBuckets: [
          { classId: 'c1', bucket: '8-9', count: 10 },
          { classId: 'c2', bucket: '8-9', count: 5 },
          { classId: 'c1', bucket: '<5', count: 2 },
        ],
        atRiskStudents: [],
      }),
    };
    service = new LecturerDashboardService(
      mockRepo as unknown as LecturerDashboardRepository,
    );
  });

  it('aggregates summary metrics, attention checks, and score distribution buckets', async () => {
    const overview = await service.getOverview(
      'lec-1',
      new Date('2026-11-23T13:00:00Z'),
      14,
    );

    expect(overview.summary).toMatchObject({
      activeClassCount: 3,
      endedClassCount: 1,
      totalStudents: 90,
      activeStudents7dCount: 64,
      pendingGradingCount: 10,
      pendingExamsCount: 4,
      pendingAssignmentsCount: 6,
      overdueGrading48hCount: 2,
      submissionRatePercent: 75,
      upcoming7dCount: 2,
      upcomingExams7dCount: 1,
      upcomingAssignments7dCount: 1,
      liveExamsCount: 1,
    });
    expect(overview.attention.unconfiguredClassesCount).toBe(1);
    expect(overview.attention.unconfiguredClasses[0]?.classCode).toBe('CS102');
    expect(overview.attention.lowSubmissionAssignmentsCount).toBe(1);
    expect(overview.attention.lowSubmissionAssignments[0]?.assignmentId).toBe(
      'a1',
    );
    expect(overview.scoreDistribution.overall).toEqual([
      { bucket: '<5', count: 2 },
      { bucket: '5-6.5', count: 0 },
      { bucket: '6.5-8', count: 0 },
      { bucket: '8-9', count: 15 },
      { bucket: '9-10', count: 0 },
    ]);
    expect(overview.scoreDistribution.byClass.c1).toContainEqual({
      bucket: '<5',
      count: 2,
    });
  });

  it('zero-fills submission trend and falls back to 14 days for unsupported windows', async () => {
    const overview = await service.getOverview(
      'lec-1',
      new Date('2026-11-23T13:00:00Z'),
      99,
    );

    expect(overview.trends.days).toBe(14);
    expect(overview.trends.submissionsByDay).toHaveLength(14);
    expect(overview.trends.submissionsByDay.at(-1)).toEqual({
      date: '2026-11-23',
      submitted: 12,
      graded: 8,
    });
    expect(overview.trends.submissionsByDay[0]).toEqual({
      date: '2026-11-10',
      submitted: 0,
      graded: 0,
    });
  });

  it('handles zero expected submissions without dividing by zero', async () => {
    mockRepo.findClassesAndSummary!.mockResolvedValue({
      activeClassCount: 0,
      endedClassCount: 0,
      totalStudents: 0,
      activeStudents7dCount: 0,
      submittedCount: 0,
      expectedSubmissionCount: 0,
      classes: [],
    });

    const overview = await service.getOverview('lec-1');
    expect(overview.summary.submissionRatePercent).toBe(0);
  });
});
