import { get } from '@core/api/http';
import { USE_MOCK } from '@core/config/env';
import {
  delay,
  mockAssignments,
  mockClasses,
  mockExamSchedules,
  mockKcMastery,
  mockSemesters,
  mockSubjects,
  mockSubmissions,
} from '@core/mocks';
import type {
  StudentDashboardDays,
  StudentDashboardOverview,
  StudentWorkItemStatus,
} from '../types/student-dashboard.types';

const DAY_MS = 24 * 60 * 60 * 1000;

const buildMockOverview = (
  days: StudentDashboardDays,
): StudentDashboardOverview => {
  const now = new Date();
  const nowMs = now.getTime();
  const semesterById = new Map(mockSemesters.map((s) => [s.id, s]));
  const subjectById = new Map(mockSubjects.map((s) => [s.id, s]));
  const classById = new Map(mockClasses.map((c) => [c.id, c]));

  const upcomingAssignments = mockAssignments
    .filter((a) => a.status === 'OPEN' || a.status === 'OVERDUE' || a.status === 'UPCOMING')
    .map((a, idx) => {
      const cls = classById.get(a.classId);
      const dueMs = nowMs + (idx === 0 ? 18 * 60 * 60 * 1000 : idx === 1 ? -2 * DAY_MS : 5 * DAY_MS);
      const status: StudentWorkItemStatus =
        a.status === 'OVERDUE'
          ? 'OVERDUE'
          : a.status === 'UPCOMING'
            ? 'UPCOMING'
            : dueMs - nowMs <= 3 * DAY_MS
              ? 'DUE_SOON'
              : 'OPEN';
      return {
        id: a.id,
        itemId: a.id,
        type: 'ASSIGNMENT' as const,
        status,
        title: a.title,
        classId: a.classId,
        classCode: cls?.classCode ?? 'CS101',
        className: cls?.name ?? '',
        startAt: a.openAt,
        dueAt: new Date(dueMs).toISOString(),
        submissionType: a.submissionType,
        durationMinutes: null,
        link: `/student/courses/${a.classId}/assignments/${a.id}`,
      };
    });

  const upcomingExams = mockExamSchedules.slice(0, 2).map((e, idx) => {
    const cls = classById.get(e.classId);
    const startMs = idx === 0 ? nowMs + 30 * 60 * 60 * 1000 : nowMs + 5 * DAY_MS;
    return {
      id: e.id,
      itemId: e.id,
      type: 'EXAM' as const,
      status: 'UPCOMING' as const,
      title: e.examName,
      classId: e.classId,
      classCode: cls?.classCode ?? 'CS101',
      className: cls?.name ?? '',
      startAt: new Date(startMs).toISOString(),
      dueAt: new Date(startMs).toISOString(),
      submissionType: null,
      durationMinutes: 60,
      link: `/student/courses/${e.classId}/exams/${e.id}`,
    };
  });

  const upcomingWork = [...upcomingAssignments, ...upcomingExams];
  const overdueCount = upcomingAssignments.filter((w) => w.status === 'OVERDUE').length;
  const openCount = upcomingAssignments.filter(
    (w) => w.status === 'OPEN' || w.status === 'DUE_SOON',
  ).length;
  const dueSoonCount = upcomingAssignments.filter(
    (w) => w.status === 'DUE_SOON',
  ).length;

  const courses = mockClasses.map((c, idx) => {
    const sub = subjectById.get(c.subjectId);
    const sem = semesterById.get(c.semesterId);
    const totalItems = 12;
    const completedItems = Math.round((c.progress / 100) * totalItems);
    return {
      id: c.id,
      code: c.classCode,
      name: c.name,
      subjectId: c.subjectId,
      subjectCode: sub?.subjectCode ?? c.subjectCode ?? 'CS101',
      subjectName: sub?.name ?? c.subjectName ?? c.name,
      semesterCode: sem?.semesterCode ?? c.semesterCode ?? 'HK1-2026',
      semesterName: sem?.name ?? 'Fall 2026',
      lecturerName: c.lecturerName ?? 'Lecturer',
      thumbnailUrl: c.coverImage ?? null,
      completedItemsCount: completedItems,
      totalItemsCount: totalItems,
      progressPercent: c.progress,
      openAssignmentsCount: idx === 0 ? 1 : 0,
      overdueAssignmentsCount: idx === 1 ? 1 : 0,
      liveOrUpcomingExamsCount: idx < 2 ? 1 : 0,
      averageScore: idx === 0 ? 8.5 : idx === 2 ? 9.0 : null,
    };
  });

  const series = Array.from({ length: days }, (_, index) => {
    const d = new Date(nowMs - (days - 1 - index) * DAY_MS);
    return {
      date: d.toISOString().slice(0, 10),
      completedItems: index % 2 === 0 ? 3 : 1,
      submissions: index % 3 === 0 ? 1 : 0,
    };
  });

  const strongCount = mockKcMastery.filter((k) => k.pMastery >= 0.7).length;
  const developingCount = mockKcMastery.filter(
    (k) => k.pMastery >= 0.4 && k.pMastery < 0.7,
  ).length;
  const weakList = [...mockKcMastery]
    .filter((k) => k.pMastery < 0.7)
    .sort((a, b) => a.pMastery - b.pMastery);
  const weakCount = mockKcMastery.filter((k) => k.pMastery < 0.4).length;

  const avgMastery = mockKcMastery.length
    ? Math.round(
        (mockKcMastery.reduce((sum, k) => sum + k.pMastery, 0) /
          mockKcMastery.length) *
          100,
      )
    : 0;

  const avgProgress = courses.length
    ? Math.round(
        courses.reduce((sum, c) => sum + c.progressPercent, 0) / courses.length,
      )
    : 0;

  const gradedSubs = mockSubmissions.filter((s) => s.score !== null);

  return {
    kpis: {
      actionRequired: {
        totalCount: overdueCount + openCount,
        liveExamsCount: 0,
        upcomingExamsCount: upcomingExams.length,
        overdueAssignmentsCount: overdueCount,
        dueSoonAssignmentsCount: dueSoonCount,
        openAssignmentsCount: openCount,
        nearestDueTitle: upcomingAssignments[0]?.title ?? null,
        nearestDueAt: upcomingAssignments[0]?.dueAt ?? null,
      },
      completion: {
        enrolledCoursesCount: courses.length,
        activeCoursesCount: courses.filter((c) => c.progressPercent < 100).length,
        completedCoursesCount: courses.filter((c) => c.progressPercent >= 100).length,
        completedItemsCount: courses.reduce((s, c) => s + c.completedItemsCount, 0),
        totalItemsCount: courses.reduce((s, c) => s + c.totalItemsCount, 0),
        averageProgressPercent: avgProgress,
      },
      academic: {
        averageScore: 8.8,
        gradedAssignmentsCount: gradedSubs.length,
        gradedExamsCount: 0,
        lowScoreCount: 0,
      },
      mastery: {
        averageMasteryPercent: avgMastery,
        totalTopicsCount: mockKcMastery.length,
        strongCount,
        developingCount,
        weakCount,
      },
    },
    attention: [
      {
        key: 'assignment_deadlines',
        label: 'Assignment deadlines',
        severity: overdueCount > 0 ? 'critical' : 'ok',
        title:
          overdueCount > 0
            ? `${overdueCount} overdue assignment not submitted`
            : 'Assignment deadlines: 0 overdue or due < 24h',
        count: overdueCount,
        classes: overdueCount > 0 ? [{ id: 'c2', code: 'IT007.Q12', name: 'Operating Systems' }] : [],
        link: '/student/assignments',
        linkLabel: 'View deadlines',
      },
      {
        key: 'exams_schedule',
        label: 'Exams schedule',
        severity: 'warning',
        title: '1 exam starts within 48h',
        count: 1,
        classes: [{ id: 'c1', code: 'SE104.Q11', name: 'Software Engineering' }],
        link: '/student/exams',
        linkLabel: 'View schedule',
      },
      {
        key: 'knowledge_review',
        label: 'Knowledge review',
        severity: weakCount > 0 ? 'warning' : 'ok',
        title:
          weakCount > 0
            ? `${weakCount} topics below 40% mastery`
            : 'Knowledge review: 0 topics below 40% mastery',
        count: weakCount,
        link: '/student/mastery',
        linkLabel: 'Review mastery',
      },
    ],
    courses,
    upcomingWork,
    studyTrend: {
      days,
      completedItemsTotal: series.reduce((s, p) => s + p.completedItems, 0),
      submissionsTotal: series.reduce((s, p) => s + p.submissions, 0),
      activeDaysCount: series.filter((p) => p.completedItems > 0 || p.submissions > 0).length,
      series,
    },
    recentGrades: gradedSubs.map((sub) => {
      const assign = mockAssignments.find((a) => a.id === sub.assignmentId);
      const cls = assign ? classById.get(assign.classId) : courses[0] ? classById.get(courses[0].id) : undefined;
      return {
        id: `assignment:${sub.id}`,
        type: 'ASSIGNMENT' as const,
        title: assign?.title ?? 'Assignment',
        classId: cls?.id ?? 'c1',
        classCode: cls?.classCode ?? 'CS101',
        className: cls?.name ?? '',
        score: sub.score ?? 0,
        comment: sub.comment,
        gradedAt: sub.submittedAt,
        link: `/student/courses/${cls?.id ?? 'c1'}/assignments/${assign?.id ?? 'a1'}`,
      };
    }),
    weakTopics: weakList.map((k) => ({
      id: k.id,
      kcId: k.kcId,
      kcName: k.kcName,
      masteryPercent: Math.round(k.pMastery * 100),
      attemptsCount: k.attemptsCount,
      lastUpdated: k.lastUpdated,
    })),
    updatedAt: now.toISOString(),
  };
};

export const studentDashboardService = {
  getOverview: (
    days: StudentDashboardDays = 14,
  ): Promise<StudentDashboardOverview> =>
    USE_MOCK
      ? delay(buildMockOverview(days))
      : get<StudentDashboardOverview>('/api/student/dashboard/overview', {
          days,
        }),
};
