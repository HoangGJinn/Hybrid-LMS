import { Injectable } from '@nestjs/common';
import {
  StudentDashboardRepository,
  type StudentAssignmentRow,
  type StudentExamRow,
} from '../repositories/student-dashboard.repository.js';
import type {
  StudentAttentionClassRef,
  StudentAttentionItem,
  StudentAttentionSeverity,
  StudentCourseSummary,
  StudentDashboardDays,
  StudentDashboardOverview,
  StudentRecentGradeItem,
  StudentUpcomingWorkItem,
  StudentWeakTopicItem,
} from '../types/student-dashboard-overview.type.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DUE_SOON_DAYS = 3;
const EXAM_UPCOMING_WINDOW_DAYS = 14;
const EXAM_SOON_HOURS = 48;
const ASSIGNMENT_URGENT_HOURS = 24;

export const ALLOWED_STUDENT_TREND_DAYS = [7, 14, 30] as const;
export const DEFAULT_STUDENT_TREND_DAYS: StudentDashboardDays = 14;

const SEVERITY_ORDER: Record<StudentAttentionSeverity, number> = {
  critical: 0,
  warning: 1,
  ok: 2,
};

const WORK_STATUS_ORDER: Record<StudentUpcomingWorkItem['status'], number> = {
  LIVE: 0,
  OVERDUE: 1,
  DUE_SOON: 2,
  OPEN: 3,
  UPCOMING: 4,
};

const toIso = (d: Date | string): string =>
  d instanceof Date ? d.toISOString() : new Date(d).toISOString();

const toVietnamDateKey = (date: Date): string =>
  new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

const getStartOfVietnamDay = (now: Date): Date => {
  const vnTime = new Date(now.getTime() + VN_OFFSET_MS);
  vnTime.setUTCHours(0, 0, 0, 0);
  return new Date(vnTime.getTime() - VN_OFFSET_MS);
};

export const normalizeStudentTrendDays = (
  days: number | undefined,
): StudentDashboardDays =>
  days === 7 || days === 14 || days === 30
    ? days
    : DEFAULT_STUDENT_TREND_DAYS;

const plural = (n: number, one: string, many: string): string =>
  n === 1 ? one : many;

const deduplicateClasses = (
  items: StudentAttentionClassRef[],
): StudentAttentionClassRef[] => {
  const seen = new Map<string, StudentAttentionClassRef>();
  for (const item of items) {
    if (!seen.has(item.id)) seen.set(item.id, item);
  }
  return Array.from(seen.values());
};

const canStudentTakeExam = (exam: StudentExamRow): boolean =>
  exam.hasInProgressSession ||
  exam.maxAttempts === null ||
  exam.completedAttemptsCount < exam.maxAttempts;

const classifyAssignment = (
  row: StudentAssignmentRow,
  nowMs: number,
): 'GRADED' | 'SUBMITTED' | 'OVERDUE' | 'DUE_SOON' | 'OPEN' | 'UPCOMING' => {
  if (row.submissionId) {
    return row.score !== null ? 'GRADED' : 'SUBMITTED';
  }
  const openMs = new Date(row.openAt).getTime();
  const endMs = new Date(row.endAt).getTime();
  if (nowMs < openMs) return 'UPCOMING';
  if (nowMs > endMs) return 'OVERDUE';
  if (endMs - nowMs <= DUE_SOON_DAYS * DAY_MS) return 'DUE_SOON';
  return 'OPEN';
};

@Injectable()
export class StudentDashboardService {
  constructor(private readonly repo: StudentDashboardRepository) { }

  async getOverview(
    studentId: string,
    now: Date = new Date(),
    days?: number,
  ): Promise<StudentDashboardOverview> {
    const trendDays = normalizeStudentTrendDays(days);
    const startOfToday = getStartOfVietnamDay(now);
    const trendFrom = new Date(
      startOfToday.getTime() - (trendDays - 1) * DAY_MS,
    );
    const nowMs = now.getTime();

    const {
      courses: coursesRows,
      assignments: assignmentRows,
      exams: examRows,
      studyActivity: trendRows,
      masteryTopics: masteryRows,
    } = await this.repo.findDashboardData(studentId, trendFrom);

    const gradedItems: StudentRecentGradeItem[] = [];
    const scoresByClass = new Map<string, number[]>();
    const openAssignmentsByClass = new Map<string, number>();
    const overdueAssignmentsByClass = new Map<string, number>();
    const liveOrUpcomingExamsByClass = new Map<string, number>();
    const upcomingWork: StudentUpcomingWorkItem[] = [];

    let overdueAssignmentsCount = 0;
    let dueSoonAssignmentsCount = 0;
    let openAssignmentsCount = 0;
    let urgent24hAssignmentsCount = 0;
    let overdueOrUrgentClasses: StudentAttentionClassRef[] = [];
    let gradedAssignmentsCount = 0;

    for (const a of assignmentRows) {
      const status = classifyAssignment(a, nowMs);
      const endMs = new Date(a.endAt).getTime();

      if (status === 'GRADED' && a.score !== null) {
        gradedAssignmentsCount += 1;
        const list = scoresByClass.get(a.classId) ?? [];
        list.push(a.score);
        scoresByClass.set(a.classId, list);
        gradedItems.push({
          id: `assignment:${a.submissionId ?? a.id}`,
          type: 'ASSIGNMENT',
          title: a.title,
          classId: a.classId,
          classCode: a.classCode,
          className: a.className,
          score: a.score,
          comment: a.comment,
          gradedAt: toIso(a.gradedAt ?? a.submittedAt ?? a.endAt),
          link: `/student/courses/${a.classId}/assignments/${a.id}`,
        });
      }

      if (
        status === 'OVERDUE' ||
        status === 'DUE_SOON' ||
        status === 'OPEN'
      ) {
        if (status === 'OVERDUE') {
          overdueAssignmentsCount += 1;
          overdueAssignmentsByClass.set(
            a.classId,
            (overdueAssignmentsByClass.get(a.classId) ?? 0) + 1,
          );
          overdueOrUrgentClasses.push({
            id: a.classId,
            code: a.classCode,
            name: a.className,
          });
        } else {
          openAssignmentsCount += 1;
          openAssignmentsByClass.set(
            a.classId,
            (openAssignmentsByClass.get(a.classId) ?? 0) + 1,
          );
          if (status === 'DUE_SOON') {
            dueSoonAssignmentsCount += 1;
          }
          if (endMs - nowMs <= ASSIGNMENT_URGENT_HOURS * HOUR_MS) {
            urgent24hAssignmentsCount += 1;
            overdueOrUrgentClasses.push({
              id: a.classId,
              code: a.classCode,
              name: a.className,
            });
          }
        }

        upcomingWork.push({
          id: a.id,
          itemId: a.itemId,
          type: 'ASSIGNMENT',
          status,
          title: a.title,
          classId: a.classId,
          classCode: a.classCode,
          className: a.className,
          startAt: toIso(a.openAt),
          dueAt: toIso(a.endAt),
          submissionType: a.submissionType,
          durationMinutes: null,
          link: `/student/courses/${a.classId}/assignments/${a.id}`,
        });
      } else if (
        status === 'UPCOMING' &&
        new Date(a.openAt).getTime() - nowMs <=
        EXAM_UPCOMING_WINDOW_DAYS * DAY_MS
      ) {
        upcomingWork.push({
          id: a.id,
          itemId: a.itemId,
          type: 'ASSIGNMENT',
          status: 'UPCOMING',
          title: a.title,
          classId: a.classId,
          classCode: a.classCode,
          className: a.className,
          startAt: toIso(a.openAt),
          dueAt: toIso(a.endAt),
          submissionType: a.submissionType,
          durationMinutes: null,
          link: `/student/courses/${a.classId}/assignments/${a.id}`,
        });
      }
    }

    let liveExamsCount = 0;
    let upcomingExams7dCount = 0;
    let examsWithin48hCount = 0;
    const liveExamClasses: StudentAttentionClassRef[] = [];
    const soonExamClasses: StudentAttentionClassRef[] = [];
    let firstLiveExamLink: string | null = null;
    let gradedExamsCount = 0;

    for (const ex of examRows) {
      const startMs = new Date(ex.startTime).getTime();
      const endMs = new Date(ex.endTime).getTime();
      const canAttempt = canStudentTakeExam(ex);

      if (ex.showResults && ex.bestScore !== null) {
        gradedExamsCount += 1;
        const list = scoresByClass.get(ex.classId) ?? [];
        list.push(ex.bestScore);
        scoresByClass.set(ex.classId, list);
        gradedItems.push({
          id: `exam:${ex.id}`,
          type: 'EXAM',
          title: ex.title,
          classId: ex.classId,
          classCode: ex.classCode,
          className: ex.className,
          score: ex.bestScore,
          comment: ex.comment,
          gradedAt: toIso(ex.gradedAt ?? ex.endTime),
          link: `/student/courses/${ex.classId}/exams/${ex.id}`,
        });
      }

      if (!canAttempt) continue;

      if (nowMs >= startMs && nowMs <= endMs) {
        liveExamsCount += 1;
        liveOrUpcomingExamsByClass.set(
          ex.classId,
          (liveOrUpcomingExamsByClass.get(ex.classId) ?? 0) + 1,
        );
        liveExamClasses.push({
          id: ex.classId,
          code: ex.classCode,
          name: ex.className,
        });
        firstLiveExamLink ??= `/student/courses/${ex.classId}/exams/${ex.id}`;
        upcomingWork.push({
          id: ex.id,
          itemId: ex.id,
          type: 'EXAM',
          status: 'LIVE',
          title: ex.title,
          classId: ex.classId,
          classCode: ex.classCode,
          className: ex.className,
          startAt: toIso(ex.startTime),
          dueAt: toIso(ex.endTime),
          submissionType: null,
          durationMinutes: ex.durationMinutes,
          link: `/student/courses/${ex.classId}/exams/${ex.id}`,
        });
      } else if (
        startMs > nowMs &&
        startMs - nowMs <= EXAM_UPCOMING_WINDOW_DAYS * DAY_MS
      ) {
        if (startMs - nowMs <= 7 * DAY_MS) {
          upcomingExams7dCount += 1;
        }
        if (startMs - nowMs <= EXAM_SOON_HOURS * HOUR_MS) {
          examsWithin48hCount += 1;
          soonExamClasses.push({
            id: ex.classId,
            code: ex.classCode,
            name: ex.className,
          });
        }
        liveOrUpcomingExamsByClass.set(
          ex.classId,
          (liveOrUpcomingExamsByClass.get(ex.classId) ?? 0) + 1,
        );
        upcomingWork.push({
          id: ex.id,
          itemId: ex.id,
          type: 'EXAM',
          status: 'UPCOMING',
          title: ex.title,
          classId: ex.classId,
          classCode: ex.classCode,
          className: ex.className,
          startAt: toIso(ex.startTime),
          dueAt: toIso(ex.startTime),
          submissionType: null,
          durationMinutes: ex.durationMinutes,
          link: `/student/courses/${ex.classId}/exams/${ex.id}`,
        });
      }
    }

    upcomingWork.sort((a, b) => {
      const rankDiff =
        WORK_STATUS_ORDER[a.status] - WORK_STATUS_ORDER[b.status];
      if (rankDiff !== 0) return rankDiff;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });

    gradedItems.sort(
      (a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime(),
    );

    const courses: StudentCourseSummary[] = coursesRows.map((c) => {
      const totalItems = Math.max(0, c.totalItemsCount);
      const completedItems = Math.min(totalItems, Math.max(0, c.completedItemsCount));
      const progressPercent =
        totalItems > 0
          ? Math.min(100, Math.round((completedItems / totalItems) * 100))
          : 0;
      const classScores = scoresByClass.get(c.id) ?? [];
      const averageScore =
        classScores.length > 0
          ? Math.round(
            (classScores.reduce((sum, s) => sum + s, 0) /
              classScores.length) *
            10,
          ) / 10
          : null;

      return {
        id: c.id,
        code: c.code,
        name: c.name,
        subjectId: c.subjectId,
        subjectCode: c.subjectCode,
        subjectName: c.subjectName,
        semesterCode: c.semesterCode,
        semesterName: c.semesterName,
        lecturerName: c.lecturerName ?? 'Lecturer',
        thumbnailUrl: null,
        completedItemsCount: completedItems,
        totalItemsCount: totalItems,
        progressPercent,
        openAssignmentsCount: openAssignmentsByClass.get(c.id) ?? 0,
        overdueAssignmentsCount: overdueAssignmentsByClass.get(c.id) ?? 0,
        liveOrUpcomingExamsCount: liveOrUpcomingExamsByClass.get(c.id) ?? 0,
        averageScore,
      };
    });

    const completedCoursesCount = courses.filter(
      (c) => c.totalItemsCount > 0 && c.progressPercent >= 100,
    ).length;
    const activeCoursesCount = courses.length - completedCoursesCount;
    const completedItemsTotal = courses.reduce(
      (sum, c) => sum + c.completedItemsCount,
      0,
    );
    const totalItemsTotal = courses.reduce(
      (sum, c) => sum + c.totalItemsCount,
      0,
    );
    const averageProgressPercent = courses.length
      ? Math.round(
        courses.reduce((sum, c) => sum + c.progressPercent, 0) /
        courses.length,
      )
      : 0;

    const averageScore =
      gradedItems.length > 0
        ? Math.round(
          (gradedItems.reduce((sum, item) => sum + item.score, 0) /
            gradedItems.length) *
          10,
        ) / 10
        : null;
    const lowScoreCount = gradedItems.filter((item) => item.score < 5).length;

    const totalTopicsCount = masteryRows.length;
    const averageMasteryPercent = totalTopicsCount
      ? Math.round(
        (masteryRows.reduce((sum, m) => sum + m.pMastery, 0) /
          totalTopicsCount) *
        100,
      )
      : 0;
    const strongCount = masteryRows.filter((m) => m.pMastery >= 0.7).length;
    const developingCount = masteryRows.filter(
      (m) => m.pMastery >= 0.4 && m.pMastery < 0.7,
    ).length;
    const weakCount = masteryRows.filter((m) => m.pMastery < 0.4).length;

    const weakTopics: StudentWeakTopicItem[] = masteryRows
      .filter((m) => m.pMastery < 0.7)
      .slice(0, 8)
      .map((m) => ({
        id: m.id,
        kcId: m.kcId,
        kcName: m.kcName,
        masteryPercent: Math.round(m.pMastery * 100),
        attemptsCount: m.attemptsCount,
        lastUpdated: toIso(m.lastUpdated),
      }));

    const byDate = new Map(trendRows.map((r) => [r.date, r]));
    const series = Array.from({ length: trendDays }, (_, index) => {
      const date = toVietnamDateKey(
        new Date(trendFrom.getTime() + index * DAY_MS),
      );
      const row = byDate.get(date);
      return {
        date,
        completedItems: row?.completedItems ?? 0,
        submissions: row?.submissions ?? 0,
      };
    });

    const trendCompletedTotal = series.reduce(
      (sum, p) => sum + p.completedItems,
      0,
    );
    const trendSubmissionsTotal = series.reduce(
      (sum, p) => sum + p.submissions,
      0,
    );
    const activeDaysCount = series.filter(
      (p) => p.completedItems > 0 || p.submissions > 0,
    ).length;

    const nearestActionable = upcomingWork.find(
      (item) => item.status !== 'UPCOMING',
    );

    const examsAttention: StudentAttentionItem =
      liveExamsCount > 0
        ? {
          key: 'exams_schedule',
          label: 'Exams schedule',
          severity: 'critical',
          title: `${liveExamsCount} ${plural(liveExamsCount, 'exam is live now', 'exams are live now')}`,
          detail: 'Active exam window open for submission',
          count: liveExamsCount,
          classes: deduplicateClasses(liveExamClasses),
          link: firstLiveExamLink ?? '/student/exams',
          linkLabel: 'Open exam',
        }
        : examsWithin48hCount > 0
          ? {
            key: 'exams_schedule',
            label: 'Exams schedule',
            severity: 'warning',
            title: `${examsWithin48hCount} ${plural(examsWithin48hCount, 'exam starts', 'exams start')} within 48h`,
            count: examsWithin48hCount,
            classes: deduplicateClasses(soonExamClasses),
            link: '/student/exams',
            linkLabel: 'View schedule',
          }
          : {
            key: 'exams_schedule',
            label: 'Exams schedule',
            severity: 'ok',
            title: 'Exams schedule — 0 exams in next 48h',
            count: 0,
            link: '/student/exams',
            linkLabel: 'All exams',
          };

    overdueOrUrgentClasses = deduplicateClasses(overdueOrUrgentClasses);
    const assignmentAttention: StudentAttentionItem =
      overdueAssignmentsCount > 0
        ? {
          key: 'assignment_deadlines',
          label: 'Assignment deadlines',
          severity: 'critical',
          title: `${overdueAssignmentsCount} overdue ${plural(overdueAssignmentsCount, 'assignment', 'assignments')} not submitted`,
          count: overdueAssignmentsCount,
          classes: overdueOrUrgentClasses,
          link: '/student/assignments',
          linkLabel: 'View deadlines',
        }
        : urgent24hAssignmentsCount > 0
          ? {
            key: 'assignment_deadlines',
            label: 'Assignment deadlines',
            severity: 'warning',
            title: `${urgent24hAssignmentsCount} ${plural(urgent24hAssignmentsCount, 'assignment due', 'assignments due')} within 24h`,
            count: urgent24hAssignmentsCount,
            classes: overdueOrUrgentClasses,
            link: '/student/assignments',
            linkLabel: 'View deadlines',
          }
          : {
            key: 'assignment_deadlines',
            label: 'Assignment deadlines',
            severity: 'ok',
            title: 'Assignment deadlines — 0 overdue or due < 24h',
            count: 0,
            link: '/student/assignments',
            linkLabel: 'All assignments',
          };

    const masteryAttention: StudentAttentionItem =
      weakCount > 0
        ? {
          key: 'knowledge_review',
          label: 'Knowledge review',
          severity: 'warning',
          title: `${weakCount} ${plural(weakCount, 'topic below', 'topics below')} 40% mastery`,
          count: weakCount,
          link: '/student/mastery',
          linkLabel: 'Review mastery',
        }
        : {
          key: 'knowledge_review',
          label: 'Knowledge review',
          severity: 'ok',
          title:
            totalTopicsCount > 0
              ? 'Knowledge review — 0 topics below 40% mastery'
              : 'Knowledge review — 0 topics below threshold',
          count: 0,
          link: '/student/mastery',
          linkLabel: 'View mastery',
        };

    const attention = [
      examsAttention,
      assignmentAttention,
      masteryAttention,
    ].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

    return {
      kpis: {
        actionRequired: {
          totalCount:
            liveExamsCount + overdueAssignmentsCount + openAssignmentsCount,
          liveExamsCount,
          upcomingExamsCount: upcomingExams7dCount,
          overdueAssignmentsCount,
          dueSoonAssignmentsCount,
          openAssignmentsCount,
          nearestDueTitle: nearestActionable?.title ?? null,
          nearestDueAt: nearestActionable?.dueAt ?? null,
        },
        completion: {
          enrolledCoursesCount: courses.length,
          activeCoursesCount,
          completedCoursesCount,
          completedItemsCount: completedItemsTotal,
          totalItemsCount: totalItemsTotal,
          averageProgressPercent,
        },
        academic: {
          averageScore,
          gradedAssignmentsCount,
          gradedExamsCount,
          lowScoreCount,
        },
        mastery: {
          averageMasteryPercent,
          totalTopicsCount,
          strongCount,
          developingCount,
          weakCount,
        },
      },
      attention,
      courses,
      upcomingWork: upcomingWork.slice(0, 10),
      studyTrend: {
        days: trendDays,
        completedItemsTotal: trendCompletedTotal,
        submissionsTotal: trendSubmissionsTotal,
        activeDaysCount,
        series,
      },
      recentGrades: gradedItems.slice(0, 6),
      weakTopics,
      updatedAt: now.toISOString(),
    };
  }
}
