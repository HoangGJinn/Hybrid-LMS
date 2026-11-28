import { USE_MOCK } from '@core/config/env';
import { get } from '@core/api/http';
import {
  delay,
  mockAssignments,
  mockClasses,
  mockExamSchedules,
  mockRoster,
  mockSubmissions,
} from '@core/mocks';
import type {
  LecturerDashboardOverview,
  LecturerTrendDays,
  ScoreDistributionBucket,
} from '../types/lecturer-dashboard.types';

const DAY_MS = 24 * 60 * 60 * 1000;

const buildMockOverview = (
  days: LecturerTrendDays,
): LecturerDashboardOverview => {
  const now = new Date();
  const activeClasses = mockClasses.filter((c) => c.isActive !== false);
  const classIds = new Set(activeClasses.map((c) => c.id));
  const classById = new Map(activeClasses.map((c) => [c.id, c]));

  const pendingSubs = mockSubmissions.filter((s) => s.score === null);
  const submissionsByDay = Array.from({ length: days }, (_, index) => {
    const d = new Date(now.getTime() - (days - 1 - index) * DAY_MS);
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      submitted: index % 3 === 0 ? 4 : index % 2 === 0 ? 2 : 1,
      graded: index % 4 === 0 ? 3 : index % 2 === 0 ? 2 : 0,
    };
  });

  const buckets = (counts: number[]): ScoreDistributionBucket[] => [
    { bucket: '<5', count: counts[0] ?? 0 },
    { bucket: '5-6.5', count: counts[1] ?? 0 },
    { bucket: '6.5-8', count: counts[2] ?? 0 },
    { bucket: '8-9', count: counts[3] ?? 0 },
    { bucket: '9-10', count: counts[4] ?? 0 },
  ];

  const byClass: Record<string, ScoreDistributionBucket[]> = {};
  for (const c of activeClasses) {
    byClass[c.id] = buckets([2, 4, 11, 8, 5]);
  }

  return {
    summary: {
      activeClassCount: activeClasses.length,
      endedClassCount: mockClasses.length - activeClasses.length,
      totalStudents: activeClasses.reduce((sum, c) => sum + c.studentCount, 0),
      activeStudents7dCount: 42,
      pendingGradingCount: pendingSubs.length,
      pendingExamsCount: 1,
      pendingAssignmentsCount: Math.max(0, pendingSubs.length - 1),
      oldestPendingSubmittedAt: pendingSubs[0]?.submittedAt ?? null,
      overdueGrading48hCount: pendingSubs.length > 0 ? 1 : 0,
      submissionRatePercent: 78,
      submittedCount: 64,
      expectedSubmissionCount: 82,
      upcoming7dCount: mockExamSchedules.length + 1,
      upcomingExams7dCount: mockExamSchedules.filter((e) =>
        classIds.has(e.classId),
      ).length,
      upcomingAssignments7dCount: 1,
      liveExamsCount: 0,
    },
    attention: {
      overdueGrading48hCount: pendingSubs.length > 0 ? 1 : 0,
      lowSubmissionAssignments: [],
      lowSubmissionAssignmentsCount: 0,
      unconfiguredClasses: [],
      unconfiguredClassesCount: 0,
    },
    trends: {
      days,
      submissionsByDay,
    },
    upcomingEvents: [
      ...mockExamSchedules.slice(0, 2).map((e) => {
        const cls = classById.get(e.classId);
        return {
          id: `exam:${e.id}`,
          kind: 'exam' as const,
          sourceId: e.id,
          classId: e.classId,
          classCode: cls?.classCode ?? 'CS101',
          className: cls?.name ?? '',
          title: e.examName,
          startAt: e.startTime,
          endAt: e.endTime,
          durationMinutes: 60,
          isLive: false,
          submittedCount: 0,
          studentCount: cls?.studentCount ?? 30,
        };
      }),
      ...mockAssignments.slice(0, 2).map((a) => {
        const cls = classById.get(a.classId);
        return {
          id: `assignment:${a.id}`,
          kind: 'assignment' as const,
          sourceId: a.id,
          classId: a.classId,
          classCode: cls?.classCode ?? 'CS101',
          className: cls?.name ?? '',
          title: a.title,
          startAt: a.openAt,
          endAt: a.endAt,
          durationMinutes: null,
          isLive: a.status === 'OPEN',
          submittedCount: 18,
          studentCount: cls?.studentCount ?? 30,
        };
      }),
    ],
    classes: activeClasses.map((c, idx) => ({
      id: c.id,
      classCode: c.classCode,
      name: c.name,
      subjectCode: c.subjectCode ?? 'CS',
      subjectName: c.subjectName ?? 'Course',
      semesterCode: c.semesterCode ?? 'HK1-2026',
      studentCount: c.studentCount,
      activeStudents7dCount: Math.max(0, c.studentCount - 4),
      itemCount: 8,
      completionRatePercent: c.progress,
      submissionRatePercent: 75 + (idx % 3) * 5,
      avgScore: 7.4 + idx * 0.2,
      pendingGradingCount: idx === 0 ? pendingSubs.length : 0,
    })),
    gradingQueue: pendingSubs.slice(0, 10).map((sub) => {
      const assign = mockAssignments.find((a) => a.id === sub.assignmentId);
      const cls = assign ? classById.get(assign.classId) : activeClasses[0];
      return {
        queueId: `assignment:${sub.id}`,
        kind: 'assignment' as const,
        sourceId: sub.assignmentId,
        classId: cls?.id ?? 'c1',
        classCode: cls?.classCode ?? 'CS101',
        className: cls?.name ?? 'Course',
        title: assign?.title ?? 'Assignment',
        studentId: sub.submittedBy,
        studentName: sub.studentName,
        studentCode: sub.studentCode,
        submittedAt: sub.submittedAt,
      };
    }),
    scoreDistribution: {
      overall: buckets([4, 8, 22, 16, 10]),
      byClass,
    },
    atRiskStudents: mockRoster
      .filter((r) => r.atRisk)
      .slice(0, 5)
      .map((r) => {
        const cls = classById.get(r.classId);
        return {
          studentId: r.id,
          studentCode: r.studentCode,
          fullName: r.fullName,
          classId: r.classId,
          classCode: cls?.classCode ?? 'CS101',
          className: cls?.name ?? '',
          missedAssignmentsCount: Math.max(
            0,
            r.submissionsTotal - r.submissionsDone,
          ),
          avgScore: r.avgScore,
          lastSeenAt: null,
          daysInactive: 9,
        };
      }),
  };
};

export const lecturerDashboardService = {
  getOverview: (
    days: LecturerTrendDays,
  ): Promise<LecturerDashboardOverview> =>
    USE_MOCK
      ? delay(buildMockOverview(days))
      : get<LecturerDashboardOverview>('/api/lecturer/dashboard/overview', {
          days,
        }),
};
