import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudentDashboardRepository } from '../repositories/student-dashboard.repository.js';
import { StudentDashboardService } from './student-dashboard.service.js';

describe('StudentDashboardService', () => {
  let service: StudentDashboardService;
  let mockRepo: Partial<
    Record<keyof StudentDashboardRepository, ReturnType<typeof vi.fn>>
  >;
  const now = new Date('2026-11-23T12:00:00Z');

  beforeEach(() => {
    mockRepo = {
      findDashboardData: vi.fn().mockResolvedValue({
        courses: [
          {
            id: 'c1',
            code: 'CS101',
            name: 'Intro to CS',
            subjectId: 'sub-1',
            subjectCode: 'CS101',
            subjectName: 'Computer Science',
            semesterCode: 'HK1-2026',
            semesterName: 'Fall 2026',
            lecturerName: 'Dr. Nguyen Van An',
            totalItemsCount: 10,
            completedItemsCount: 6,
          },
          {
            id: 'c2',
            code: 'SE104',
            name: 'Software Engineering',
            subjectId: 'sub-2',
            subjectCode: 'SE104',
            subjectName: 'Software Engineering',
            semesterCode: 'HK1-2026',
            semesterName: 'Fall 2026',
            lecturerName: 'Dr. Tran Thi Binh',
            totalItemsCount: 5,
            completedItemsCount: 5,
          },
        ],
        assignments: [
          {
            id: 'a-overdue',
            itemId: 'si-1',
            classId: 'c1',
            classCode: 'CS101',
            className: 'Intro to CS',
            title: 'Lab 1: Pointers',
            openAt: new Date('2026-11-10T00:00:00Z'),
            endAt: new Date('2026-11-22T23:59:00Z'),
            submissionType: 'FILE',
            submissionId: null,
            submittedAt: null,
            score: null,
            comment: null,
            gradedAt: null,
          },
          {
            id: 'a-open',
            itemId: 'si-2',
            classId: 'c1',
            classCode: 'CS101',
            className: 'Intro to CS',
            title: 'Lab 2: Recursion',
            openAt: new Date('2026-11-20T00:00:00Z'),
            endAt: new Date('2026-11-25T12:00:00Z'),
            submissionType: 'BOTH',
            submissionId: null,
            submittedAt: null,
            score: null,
            comment: null,
            gradedAt: null,
          },
          {
            id: 'a-graded',
            itemId: 'si-3',
            classId: 'c2',
            classCode: 'SE104',
            className: 'Software Engineering',
            title: 'SRS Draft',
            openAt: new Date('2026-11-01T00:00:00Z'),
            endAt: new Date('2026-11-15T23:59:00Z'),
            submissionType: 'FILE',
            submissionId: 'sub-1',
            submittedAt: new Date('2026-11-14T10:00:00Z'),
            score: 8.5,
            comment: 'Clear requirements.',
            gradedAt: new Date('2026-11-20T08:00:00Z'),
          },
        ],
        exams: [
          {
            id: 'ex-live',
            classId: 'c1',
            classCode: 'CS101',
            className: 'Intro to CS',
            title: 'Midterm Coding Exam',
            startTime: new Date('2026-11-23T11:30:00Z'),
            endTime: new Date('2026-11-23T13:30:00Z'),
            durationMinutes: 90,
            maxAttempts: 1,
            showResults: true,
            completedAttemptsCount: 0,
            hasInProgressSession: false,
            bestScore: null,
            comment: null,
            gradedAt: null,
          },
          {
            id: 'ex-hidden-grade',
            classId: 'c2',
            classCode: 'SE104',
            className: 'Software Engineering',
            title: 'Hidden Score Quiz',
            startTime: new Date('2026-11-18T08:00:00Z'),
            endTime: new Date('2026-11-18T09:00:00Z'),
            durationMinutes: 45,
            maxAttempts: 1,
            showResults: false,
            completedAttemptsCount: 1,
            hasInProgressSession: false,
            bestScore: 4.0,
            comment: 'Should stay hidden',
            gradedAt: new Date('2026-11-19T10:00:00Z'),
          },
          {
            id: 'ex-visible-grade',
            classId: 'c2',
            classCode: 'SE104',
            className: 'Software Engineering',
            title: 'Unit 1 Quiz',
            startTime: new Date('2026-11-12T08:00:00Z'),
            endTime: new Date('2026-11-12T09:00:00Z'),
            durationMinutes: 30,
            maxAttempts: 1,
            showResults: true,
            completedAttemptsCount: 1,
            hasInProgressSession: false,
            bestScore: 9.5,
            comment: null,
            gradedAt: new Date('2026-11-22T09:00:00Z'),
          },
        ],
        studyActivity: [
          { date: '2026-11-23', completedItems: 3, submissions: 1 },
        ],
        masteryTopics: [
          {
            id: 'm1',
            kcId: 'kc1',
            kcName: 'Graph Traversal',
            pMastery: 0.25,
            attemptsCount: 2,
            lastUpdated: new Date('2026-11-21T10:00:00Z'),
          },
          {
            id: 'm2',
            kcId: 'kc2',
            kcName: 'Sorting Algorithms',
            pMastery: 0.85,
            attemptsCount: 6,
            lastUpdated: new Date('2026-11-22T10:00:00Z'),
          },
        ],
      }),
    };

    service = new StudentDashboardService(
      mockRepo as unknown as StudentDashboardRepository,
    );
  });

  it('computes KPIs, real course progress, upcomingWork priority, and visible recentGrades', async () => {
    const overview = await service.getOverview('stu-1', now, 14);

    expect(overview.kpis.actionRequired).toMatchObject({
      totalCount: 3,
      liveExamsCount: 1,
      overdueAssignmentsCount: 1,
      openAssignmentsCount: 1,
      dueSoonAssignmentsCount: 1,
      nearestDueTitle: 'Midterm Coding Exam',
    });

    expect(overview.kpis.completion).toEqual({
      enrolledCoursesCount: 2,
      activeCoursesCount: 1,
      completedCoursesCount: 1,
      completedItemsCount: 11,
      totalItemsCount: 15,
      averageProgressPercent: 80,
    });

    // Hidden score exam (showResults: false) must be excluded from academic average and recentGrades.
    expect(overview.kpis.academic).toEqual({
      averageScore: 9.0,
      gradedAssignmentsCount: 1,
      gradedExamsCount: 1,
      lowScoreCount: 0,
    });
    expect(overview.recentGrades.map((g) => g.title)).toEqual([
      'Unit 1 Quiz',
      'SRS Draft',
    ]);

    expect(overview.kpis.mastery).toEqual({
      averageMasteryPercent: 55,
      totalTopicsCount: 2,
      strongCount: 1,
      developingCount: 0,
      weakCount: 1,
    });

    // Live exam first, then overdue assignment, then due-soon assignment.
    expect(overview.upcomingWork.map((w) => [w.status, w.id])).toEqual([
      ['LIVE', 'ex-live'],
      ['OVERDUE', 'a-overdue'],
      ['DUE_SOON', 'a-open'],
    ]);

    expect(overview.courses[0]).toMatchObject({
      code: 'CS101',
      progressPercent: 60,
      openAssignmentsCount: 1,
      overdueAssignmentsCount: 1,
      liveOrUpcomingExamsCount: 1,
      averageScore: null,
    });
    expect(overview.courses[1]).toMatchObject({
      code: 'SE104',
      progressPercent: 100,
      averageScore: 9.0,
    });
  });

  it('always returns 3 fixed attention checks ordered critical -> warning -> ok', async () => {
    const overview = await service.getOverview('stu-1', now, 7);

    expect(overview.attention).toHaveLength(3);
    expect(overview.attention.map((a) => [a.key, a.severity])).toEqual([
      ['exams_schedule', 'critical'],
      ['assignment_deadlines', 'critical'],
      ['knowledge_review', 'warning'],
    ]);

    // Clear all issues to verify 'ok' checks still remain visible.
    mockRepo.findDashboardData!.mockResolvedValue({
      courses: [],
      assignments: [],
      exams: [],
      studyActivity: [],
      masteryTopics: [],
    });
    const clean = await service.getOverview('stu-1', now, 7);
    expect(clean.attention.map((a) => [a.key, a.severity])).toEqual([
      ['exams_schedule', 'ok'],
      ['assignment_deadlines', 'ok'],
      ['knowledge_review', 'ok'],
    ]);
  });

  it('zero-fills studyTrend and falls back to 14 days on invalid window', async () => {
    const overview = await service.getOverview('stu-1', now, 99);

    expect(overview.studyTrend.days).toBe(14);
    expect(overview.studyTrend.series).toHaveLength(14);
    expect(overview.studyTrend.completedItemsTotal).toBe(3);
    expect(overview.studyTrend.submissionsTotal).toBe(1);
    expect(overview.studyTrend.activeDaysCount).toBe(1);
    expect(overview.studyTrend.series.at(-1)).toEqual({
      date: '2026-11-23',
      completedItems: 3,
      submissions: 1,
    });
  });
});
