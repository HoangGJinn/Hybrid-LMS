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
const MAX_WEAK_TOPICS = 8;
const MAX_UPCOMING_WORK = 10;
const MAX_RECENT_GRADES = 6;

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

type AssignmentStatus =
  | 'GRADED'
  | 'SUBMITTED'
  | 'OVERDUE'
  | 'DUE_SOON'
  | 'OPEN'
  | 'UPCOMING';
type ActiveAssignmentStatus = 'OVERDUE' | 'DUE_SOON' | 'OPEN';
type DashboardData = Awaited<
  ReturnType<StudentDashboardRepository['findDashboardData']>
>;
type CourseRow = DashboardData['courses'][number];
type MasteryRow = DashboardData['masteryTopics'][number];
type TrendRow = DashboardData['studyActivity'][number];
type ClassRowRef = { classId: string; classCode: string; className: string };

interface Accumulator {
  readonly gradedItems: StudentRecentGradeItem[];
  readonly scoresByClass: Map<string, number[]>;
  readonly openAssignmentsByClass: Map<string, number>;
  readonly overdueAssignmentsByClass: Map<string, number>;
  readonly liveOrUpcomingExamsByClass: Map<string, number>;
  readonly upcomingWork: StudentUpcomingWorkItem[];
  readonly overdueOrUrgentClasses: StudentAttentionClassRef[];
  readonly liveExamClasses: StudentAttentionClassRef[];
  readonly soonExamClasses: StudentAttentionClassRef[];
  overdueAssignmentsCount: number;
  dueSoonAssignmentsCount: number;
  openAssignmentsCount: number;
  urgent24hAssignmentsCount: number;
  gradedAssignmentsCount: number;
  liveExamsCount: number;
  upcomingExams7dCount: number;
  examsWithin48hCount: number;
  gradedExamsCount: number;
  firstLiveExamLink: string | null;
}

const createAccumulator = (): Accumulator => ({
  gradedItems: [],
  scoresByClass: new Map(),
  openAssignmentsByClass: new Map(),
  overdueAssignmentsByClass: new Map(),
  liveOrUpcomingExamsByClass: new Map(),
  upcomingWork: [],
  overdueOrUrgentClasses: [],
  liveExamClasses: [],
  soonExamClasses: [],
  overdueAssignmentsCount: 0,
  dueSoonAssignmentsCount: 0,
  openAssignmentsCount: 0,
  urgent24hAssignmentsCount: 0,
  gradedAssignmentsCount: 0,
  liveExamsCount: 0,
  upcomingExams7dCount: 0,
  examsWithin48hCount: 0,
  gradedExamsCount: 0,
  firstLiveExamLink: null,
});

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

const roundOne = (value: number): number => Math.round(value * 10) / 10;

const averageOf = (values: readonly number[]): number | null =>
  values.length > 0
    ? roundOne(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;

const bump = (map: Map<string, number>, key: string): void => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const toClassRef = (row: ClassRowRef): StudentAttentionClassRef => ({
  id: row.classId,
  code: row.classCode,
  name: row.className,
});

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
): AssignmentStatus => {
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

const recordScore = (
  acc: Accumulator,
  classId: string,
  score: number,
): void => {
  const list = acc.scoresByClass.get(classId) ?? [];
  list.push(score);
  acc.scoresByClass.set(classId, list);
};

const assignmentLink = (a: StudentAssignmentRow): string =>
  `/student/courses/${a.classId}/assignments/${a.id}`;

const examLink = (ex: StudentExamRow): string =>
  `/student/courses/${ex.classId}/exams/${ex.id}`;

const recordGradedAssignment = (
  acc: Accumulator,
  a: StudentAssignmentRow,
  score: number,
): void => {
  acc.gradedAssignmentsCount += 1;
  recordScore(acc, a.classId, score);
  acc.gradedItems.push({
    id: `assignment:${a.submissionId ?? a.id}`,
    type: 'ASSIGNMENT',
    title: a.title,
    classId: a.classId,
    classCode: a.classCode,
    className: a.className,
    score,
    comment: a.comment,
    gradedAt: toIso(a.gradedAt ?? a.submittedAt ?? a.endAt),
    link: assignmentLink(a),
  });
};

const toAssignmentWorkItem = (
  a: StudentAssignmentRow,
  status: StudentUpcomingWorkItem['status'],
): StudentUpcomingWorkItem => ({
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
  link: assignmentLink(a),
});

const recordActiveAssignment = (
  acc: Accumulator,
  a: StudentAssignmentRow,
  status: ActiveAssignmentStatus,
  nowMs: number,
): void => {
  if (status === 'OVERDUE') {
    acc.overdueAssignmentsCount += 1;
    bump(acc.overdueAssignmentsByClass, a.classId);
    acc.overdueOrUrgentClasses.push(toClassRef(a));
    return;
  }
  acc.openAssignmentsCount += 1;
  bump(acc.openAssignmentsByClass, a.classId);
  if (status === 'DUE_SOON') acc.dueSoonAssignmentsCount += 1;
  const endMs = new Date(a.endAt).getTime();
  if (endMs - nowMs <= ASSIGNMENT_URGENT_HOURS * HOUR_MS) {
    acc.urgent24hAssignmentsCount += 1;
    acc.overdueOrUrgentClasses.push(toClassRef(a));
  }
};

const collectAssignment = (
  acc: Accumulator,
  a: StudentAssignmentRow,
  nowMs: number,
): void => {
  const status = classifyAssignment(a, nowMs);
  if (status === 'GRADED' && a.score !== null) {
    recordGradedAssignment(acc, a, a.score);
  }
  if (status === 'OVERDUE' || status === 'DUE_SOON' || status === 'OPEN') {
    recordActiveAssignment(acc, a, status, nowMs);
    acc.upcomingWork.push(toAssignmentWorkItem(a, status));
    return;
  }
  const opensWithinWindow =
    new Date(a.openAt).getTime() - nowMs <=
    EXAM_UPCOMING_WINDOW_DAYS * DAY_MS;
  if (status === 'UPCOMING' && opensWithinWindow) {
    acc.upcomingWork.push(toAssignmentWorkItem(a, 'UPCOMING'));
  }
};

const recordGradedExam = (
  acc: Accumulator,
  ex: StudentExamRow,
  score: number,
): void => {
  acc.gradedExamsCount += 1;
  recordScore(acc, ex.classId, score);
  acc.gradedItems.push({
    id: `exam:${ex.id}`,
    type: 'EXAM',
    title: ex.title,
    classId: ex.classId,
    classCode: ex.classCode,
    className: ex.className,
    score,
    comment: ex.comment,
    gradedAt: toIso(ex.gradedAt ?? ex.endTime),
    link: examLink(ex),
  });
};

const toExamWorkItem = (
  ex: StudentExamRow,
  status: 'LIVE' | 'UPCOMING',
): StudentUpcomingWorkItem => ({
  id: ex.id,
  itemId: ex.id,
  type: 'EXAM',
  status,
  title: ex.title,
  classId: ex.classId,
  classCode: ex.classCode,
  className: ex.className,
  startAt: toIso(ex.startTime),
  dueAt: toIso(status === 'LIVE' ? ex.endTime : ex.startTime),
  submissionType: null,
  durationMinutes: ex.durationMinutes,
  link: examLink(ex),
});

const recordLiveExam = (acc: Accumulator, ex: StudentExamRow): void => {
  acc.liveExamsCount += 1;
  bump(acc.liveOrUpcomingExamsByClass, ex.classId);
  acc.liveExamClasses.push(toClassRef(ex));
  acc.firstLiveExamLink ??= examLink(ex);
  acc.upcomingWork.push(toExamWorkItem(ex, 'LIVE'));
};

const recordUpcomingExam = (
  acc: Accumulator,
  ex: StudentExamRow,
  untilStartMs: number,
): void => {
  if (untilStartMs <= 7 * DAY_MS) acc.upcomingExams7dCount += 1;
  if (untilStartMs <= EXAM_SOON_HOURS * HOUR_MS) {
    acc.examsWithin48hCount += 1;
    acc.soonExamClasses.push(toClassRef(ex));
  }
  bump(acc.liveOrUpcomingExamsByClass, ex.classId);
  acc.upcomingWork.push(toExamWorkItem(ex, 'UPCOMING'));
};

const collectExam = (
  acc: Accumulator,
  ex: StudentExamRow,
  nowMs: number,
): void => {
  if (ex.showResults && ex.bestScore !== null) {
    recordGradedExam(acc, ex, ex.bestScore);
  }
  if (!canStudentTakeExam(ex)) return;
  const startMs = new Date(ex.startTime).getTime();
  const endMs = new Date(ex.endTime).getTime();
  if (nowMs >= startMs && nowMs <= endMs) {
    recordLiveExam(acc, ex);
    return;
  }
  const untilStartMs = startMs - nowMs;
  if (untilStartMs > 0 && untilStartMs <= EXAM_UPCOMING_WINDOW_DAYS * DAY_MS) {
    recordUpcomingExam(acc, ex, untilStartMs);
  }
};

const buildExamsAttention = (acc: Accumulator): StudentAttentionItem => {
  if (acc.liveExamsCount > 0) {
    return {
      key: 'exams_schedule',
      label: 'Exams schedule',
      severity: 'critical',
      title: `${acc.liveExamsCount} ${plural(acc.liveExamsCount, 'exam is live now', 'exams are live now')}`,
      detail: 'Active exam window open for submission',
      count: acc.liveExamsCount,
      classes: deduplicateClasses(acc.liveExamClasses),
      link: acc.firstLiveExamLink ?? '/student/exams',
      linkLabel: 'Open exam',
    };
  }
  if (acc.examsWithin48hCount > 0) {
    return {
      key: 'exams_schedule',
      label: 'Exams schedule',
      severity: 'warning',
      title: `${acc.examsWithin48hCount} ${plural(acc.examsWithin48hCount, 'exam starts', 'exams start')} within 48h`,
      count: acc.examsWithin48hCount,
      classes: deduplicateClasses(acc.soonExamClasses),
      link: '/student/exams',
      linkLabel: 'View schedule',
    };
  }
  return {
    key: 'exams_schedule',
    label: 'Exams schedule',
    severity: 'ok',
    title: 'Exams schedule: 0 exams in next 48h',
    count: 0,
    link: '/student/exams',
    linkLabel: 'All exams',
  };
};

const buildAssignmentAttention = (acc: Accumulator): StudentAttentionItem => {
  const classes = deduplicateClasses(acc.overdueOrUrgentClasses);
  if (acc.overdueAssignmentsCount > 0) {
    return {
      key: 'assignment_deadlines',
      label: 'Assignment deadlines',
      severity: 'critical',
      title: `${acc.overdueAssignmentsCount} overdue ${plural(acc.overdueAssignmentsCount, 'assignment', 'assignments')} not submitted`,
      count: acc.overdueAssignmentsCount,
      classes,
      link: '/student/assignments',
      linkLabel: 'View deadlines',
    };
  }
  if (acc.urgent24hAssignmentsCount > 0) {
    return {
      key: 'assignment_deadlines',
      label: 'Assignment deadlines',
      severity: 'warning',
      title: `${acc.urgent24hAssignmentsCount} ${plural(acc.urgent24hAssignmentsCount, 'assignment due', 'assignments due')} within 24h`,
      count: acc.urgent24hAssignmentsCount,
      classes,
      link: '/student/assignments',
      linkLabel: 'View deadlines',
    };
  }
  return {
    key: 'assignment_deadlines',
    label: 'Assignment deadlines',
    severity: 'ok',
    title: 'Assignment deadlines: 0 overdue or due < 24h',
    count: 0,
    link: '/student/assignments',
    linkLabel: 'All assignments',
  };
};

const buildMasteryAttention = (
  weakCount: number,
  totalTopicsCount: number,
): StudentAttentionItem => {
  if (weakCount > 0) {
    return {
      key: 'knowledge_review',
      label: 'Knowledge review',
      severity: 'warning',
      title: `${weakCount} ${plural(weakCount, 'topic below', 'topics below')} 40% mastery`,
      count: weakCount,
      link: '/student/mastery',
      linkLabel: 'Review mastery',
    };
  }
  return {
    key: 'knowledge_review',
    label: 'Knowledge review',
    severity: 'ok',
    title:
      totalTopicsCount > 0
        ? 'Knowledge review: 0 topics below 40% mastery'
        : 'Knowledge review: 0 topics below threshold',
    count: 0,
    link: '/student/mastery',
    linkLabel: 'View mastery',
  };
};

const buildCourseSummary = (
  c: CourseRow,
  acc: Accumulator,
): StudentCourseSummary => {
  const totalItems = Math.max(0, c.totalItemsCount);
  const completedItems = Math.min(
    totalItems,
    Math.max(0, c.completedItemsCount),
  );
  const progressPercent =
    totalItems > 0
      ? Math.min(100, Math.round((completedItems / totalItems) * 100))
      : 0;
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
    openAssignmentsCount: acc.openAssignmentsByClass.get(c.id) ?? 0,
    overdueAssignmentsCount: acc.overdueAssignmentsByClass.get(c.id) ?? 0,
    liveOrUpcomingExamsCount: acc.liveOrUpcomingExamsByClass.get(c.id) ?? 0,
    averageScore: averageOf(acc.scoresByClass.get(c.id) ?? []),
  };
};

const summarizeCourses = (courses: readonly StudentCourseSummary[]) => {
  const completedCoursesCount = courses.filter(
    (c) => c.totalItemsCount > 0 && c.progressPercent >= 100,
  ).length;
  const averageProgressPercent = courses.length
    ? Math.round(
        courses.reduce((sum, c) => sum + c.progressPercent, 0) /
          courses.length,
      )
    : 0;
  return {
    completedCoursesCount,
    activeCoursesCount: courses.length - completedCoursesCount,
    completedItemsTotal: courses.reduce(
      (sum, c) => sum + c.completedItemsCount,
      0,
    ),
    totalItemsTotal: courses.reduce((sum, c) => sum + c.totalItemsCount, 0),
    averageProgressPercent,
  };
};

const summarizeMastery = (rows: readonly MasteryRow[]) => {
  const totalTopicsCount = rows.length;
  const averageMasteryPercent = totalTopicsCount
    ? Math.round(
        (rows.reduce((sum, m) => sum + m.pMastery, 0) / totalTopicsCount) * 100,
      )
    : 0;
  return {
    totalTopicsCount,
    averageMasteryPercent,
    strongCount: rows.filter((m) => m.pMastery >= 0.7).length,
    developingCount: rows.filter((m) => m.pMastery >= 0.4 && m.pMastery < 0.7)
      .length,
    weakCount: rows.filter((m) => m.pMastery < 0.4).length,
  };
};

const buildWeakTopics = (
  rows: readonly MasteryRow[],
): StudentWeakTopicItem[] =>
  rows
    .filter((m) => m.pMastery < 0.7)
    .slice(0, MAX_WEAK_TOPICS)
    .map((m) => ({
      id: m.id,
      kcId: m.kcId,
      kcName: m.kcName,
      masteryPercent: Math.round(m.pMastery * 100),
      attemptsCount: m.attemptsCount,
      lastUpdated: toIso(m.lastUpdated),
    }));

const buildStudySeries = (
  trendRows: readonly TrendRow[],
  trendFrom: Date,
  trendDays: number,
) => {
  const byDate = new Map(trendRows.map((r) => [r.date, r]));
  return Array.from({ length: trendDays }, (_, index) => {
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
};

@Injectable()
export class StudentDashboardService {
  constructor(private readonly repo: StudentDashboardRepository) {}

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

    const acc = createAccumulator();
    for (const a of assignmentRows) collectAssignment(acc, a, nowMs);
    for (const ex of examRows) collectExam(acc, ex, nowMs);

    acc.upcomingWork.sort((a, b) => {
      const rankDiff =
        WORK_STATUS_ORDER[a.status] - WORK_STATUS_ORDER[b.status];
      if (rankDiff !== 0) return rankDiff;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
    acc.gradedItems.sort(
      (a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime(),
    );

    const courses = coursesRows.map((c) => buildCourseSummary(c, acc));
    const courseTotals = summarizeCourses(courses);
    const mastery = summarizeMastery(masteryRows);
    const series = buildStudySeries(trendRows, trendFrom, trendDays);
    const nearestActionable = acc.upcomingWork.find(
      (item) => item.status !== 'UPCOMING',
    );

    const attention = [
      buildExamsAttention(acc),
      buildAssignmentAttention(acc),
      buildMasteryAttention(mastery.weakCount, mastery.totalTopicsCount),
    ].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

    return {
      kpis: {
        actionRequired: {
          totalCount:
            acc.liveExamsCount +
            acc.overdueAssignmentsCount +
            acc.openAssignmentsCount,
          liveExamsCount: acc.liveExamsCount,
          upcomingExamsCount: acc.upcomingExams7dCount,
          overdueAssignmentsCount: acc.overdueAssignmentsCount,
          dueSoonAssignmentsCount: acc.dueSoonAssignmentsCount,
          openAssignmentsCount: acc.openAssignmentsCount,
          nearestDueTitle: nearestActionable?.title ?? null,
          nearestDueAt: nearestActionable?.dueAt ?? null,
        },
        completion: {
          enrolledCoursesCount: courses.length,
          activeCoursesCount: courseTotals.activeCoursesCount,
          completedCoursesCount: courseTotals.completedCoursesCount,
          completedItemsCount: courseTotals.completedItemsTotal,
          totalItemsCount: courseTotals.totalItemsTotal,
          averageProgressPercent: courseTotals.averageProgressPercent,
        },
        academic: {
          averageScore: averageOf(acc.gradedItems.map((item) => item.score)),
          gradedAssignmentsCount: acc.gradedAssignmentsCount,
          gradedExamsCount: acc.gradedExamsCount,
          lowScoreCount: acc.gradedItems.filter((item) => item.score < 5)
            .length,
        },
        mastery: {
          averageMasteryPercent: mastery.averageMasteryPercent,
          totalTopicsCount: mastery.totalTopicsCount,
          strongCount: mastery.strongCount,
          developingCount: mastery.developingCount,
          weakCount: mastery.weakCount,
        },
      },
      attention,
      courses,
      upcomingWork: acc.upcomingWork.slice(0, MAX_UPCOMING_WORK),
      studyTrend: {
        days: trendDays,
        completedItemsTotal: series.reduce((s, p) => s + p.completedItems, 0),
        submissionsTotal: series.reduce((s, p) => s + p.submissions, 0),
        activeDaysCount: series.filter(
          (p) => p.completedItems > 0 || p.submissions > 0,
        ).length,
        series,
      },
      recentGrades: acc.gradedItems.slice(0, MAX_RECENT_GRADES),
      weakTopics: buildWeakTopics(masteryRows),
      updatedAt: now.toISOString(),
    };
  }
}
