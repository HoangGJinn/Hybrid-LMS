import { Injectable } from '@nestjs/common';
import {
  LecturerDashboardRepository,
  type LecturerScheduleCandidateRow,
  type LecturerScoreBucketRow,
} from '../repositories/lecturer-dashboard.repository.js';
import type {
  LecturerAttentionAssignmentItem,
  LecturerAttentionClassItem,
  LecturerDashboardOverview,
  LecturerScoreDistribution,
  LecturerUpcomingEventItem,
  ScoreBucketLabel,
  ScoreDistributionBucket,
} from '../types/lecturer-dashboard-overview.type.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const OVERDUE_GRADING_MS = 48 * 60 * 60 * 1000;
const RECENT_CLOSED_DAYS = 7;
const DUE_SOON_HOURS = 48;
const ACTIVE_WINDOW_DAYS = 7;
const UPCOMING_WINDOW_DAYS = 7;
const ATTENTION_LIMIT = 6;
const UPCOMING_LIMIT = 8;

export const ALLOWED_TREND_DAYS = [7, 14, 30] as const;
export const DEFAULT_TREND_DAYS = 14;
export const SCORE_BUCKETS: readonly ScoreBucketLabel[] = [
  '<5',
  '5-6.5',
  '6.5-8',
  '8-9',
  '9-10',
];

const toVietnamDateKey = (date: Date): string =>
  new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

const getStartOfVietnamDay = (now: Date): Date => {
  const vnTime = new Date(now.getTime() + VN_OFFSET_MS);
  vnTime.setUTCHours(0, 0, 0, 0);
  return new Date(vnTime.getTime() - VN_OFFSET_MS);
};

const normalizeTrendDays = (days: number | undefined): number =>
  (ALLOWED_TREND_DAYS as readonly number[]).includes(days ?? -1)
    ? (days as number)
    : DEFAULT_TREND_DAYS;

const toMs = (d: Date | string): number =>
  d instanceof Date ? d.getTime() : new Date(d).getTime();

const buildHistogram = (
  counts: Map<ScoreBucketLabel, number>,
): ScoreDistributionBucket[] =>
  SCORE_BUCKETS.map((bucket) => ({
    bucket,
    count: counts.get(bucket) ?? 0,
  }));

const buildScoreDistribution = (
  rows: LecturerScoreBucketRow[],
): LecturerScoreDistribution => {
  const overallMap = new Map<ScoreBucketLabel, number>();
  const byClassMap = new Map<string, Map<ScoreBucketLabel, number>>();

  for (const row of rows) {
    overallMap.set(row.bucket, (overallMap.get(row.bucket) ?? 0) + row.count);
    let classMap = byClassMap.get(row.classId);
    if (!classMap) {
      classMap = new Map<ScoreBucketLabel, number>();
      byClassMap.set(row.classId, classMap);
    }
    classMap.set(row.bucket, (classMap.get(row.bucket) ?? 0) + row.count);
  }

  const byClass: Record<string, ScoreDistributionBucket[]> = {};
  for (const [classId, map] of byClassMap.entries()) {
    byClass[classId] = buildHistogram(map);
  }

  return {
    overall: buildHistogram(overallMap),
    byClass,
  };
};

const extractUpcomingEvents = (
  candidates: LecturerScheduleCandidateRow[],
  nowMs: number,
  upcomingToMs: number,
): LecturerUpcomingEventItem[] =>
  candidates
    .filter((ev) => {
      const endMs = toMs(ev.endAt);
      const startMs = toMs(ev.startAt);
      if (endMs < nowMs) return false;
      return ev.kind === 'exam'
        ? startMs <= upcomingToMs
        : endMs <= upcomingToMs;
    })
    .sort((a, b) => {
      const aLiveExam = a.kind === 'exam' && a.isLive ? 0 : 1;
      const bLiveExam = b.kind === 'exam' && b.isLive ? 0 : 1;
      if (aLiveExam !== bLiveExam) return aLiveExam - bLiveExam;
      const aSortTime = toMs(a.kind === 'exam' ? a.startAt : a.endAt);
      const bSortTime = toMs(b.kind === 'exam' ? b.startAt : b.endAt);
      return aSortTime - bSortTime;
    })
    .slice(0, UPCOMING_LIMIT);

const extractLowSubmissionAssignments = (
  candidates: LecturerScheduleCandidateRow[],
  nowMs: number,
  recentClosedMs: number,
  dueSoonMs: number,
): { items: LecturerAttentionAssignmentItem[]; totalCount: number } => {
  const matched = candidates
    .filter((ev) => {
      if (ev.kind !== 'assignment') return false;
      const startMs = toMs(ev.startAt);
      const endMs = toMs(ev.endAt);
      return (
        startMs <= nowMs &&
        endMs >= recentClosedMs &&
        endMs <= dueSoonMs &&
        ev.studentCount > 0 &&
        ev.submittedCount * 2 < ev.studentCount
      );
    })
    .sort((a, b) => toMs(a.endAt) - toMs(b.endAt))
    .map((ev) => ({
      assignmentId: ev.sourceId,
      classId: ev.classId,
      classCode: ev.classCode,
      title: ev.title,
      endAt: ev.endAt,
      submittedCount: ev.submittedCount,
      studentCount: ev.studentCount,
    }));

  return {
    items: matched.slice(0, ATTENTION_LIMIT),
    totalCount: matched.length,
  };
};

@Injectable()
export class LecturerDashboardService {
  constructor(private readonly repo: LecturerDashboardRepository) {}

  async getOverview(
    lecturerId: string,
    now: Date = new Date(),
    days?: number,
  ): Promise<LecturerDashboardOverview> {
    const trendDays = normalizeTrendDays(days);
    const startOfToday = getStartOfVietnamDay(now);
    const trendFrom = new Date(startOfToday.getTime() - (trendDays - 1) * DAY_MS);
    const activeSince = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * DAY_MS);
    const overdueCutoff = new Date(now.getTime() - OVERDUE_GRADING_MS);
    const recentClosedCutoff = new Date(
      now.getTime() - RECENT_CLOSED_DAYS * DAY_MS,
    );
    const dueSoonCutoff = new Date(
      now.getTime() + DUE_SOON_HOURS * 60 * 60 * 1000,
    );
    const upcomingTo = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * DAY_MS);

    const [
      classesSummary,
      scheduleCandidates,
      gradingOverview,
      analyticsAndAtRisk,
    ] = await Promise.all([
      this.repo.findClassesAndSummary(lecturerId, activeSince, now),
      this.repo.findScheduleAndLowSubmissions(
        lecturerId,
        now,
        recentClosedCutoff,
        dueSoonCutoff,
        upcomingTo,
      ),
      this.repo.findGradingOverview(lecturerId, overdueCutoff),
      this.repo.findAnalyticsAndAtRisk(
        lecturerId,
        now,
        activeSince,
        trendFrom,
      ),
    ]);

    const nowMs = now.getTime();
    const upcomingEvents = extractUpcomingEvents(
      scheduleCandidates,
      nowMs,
      upcomingTo.getTime(),
    );
    const lowSubmissionAssignments = extractLowSubmissionAssignments(
      scheduleCandidates,
      nowMs,
      recentClosedCutoff.getTime(),
      dueSoonCutoff.getTime(),
    );

    const unconfiguredAll: LecturerAttentionClassItem[] = classesSummary.classes
      .filter((c) => c.studentCount === 0 || c.itemCount === 0)
      .map((c) => ({
        id: c.id,
        classCode: c.classCode,
        name: c.name,
        studentCount: c.studentCount,
        itemCount: c.itemCount,
      }))
      .sort((a, b) => a.classCode.localeCompare(b.classCode));

    const byDate = new Map(analyticsAndAtRisk.trend.map((r) => [r.date, r]));
    const submissionsByDay = Array.from({ length: trendDays }, (_, index) => {
      const date = toVietnamDateKey(
        new Date(trendFrom.getTime() + index * DAY_MS),
      );
      const row = byDate.get(date);
      return {
        date,
        submitted: row?.submitted ?? 0,
        graded: row?.graded ?? 0,
      };
    });

    const submissionRatePercent =
      classesSummary.expectedSubmissionCount > 0
        ? Math.min(
            100,
            Math.round(
              (classesSummary.submittedCount /
                classesSummary.expectedSubmissionCount) *
                100,
            ),
          )
        : 0;

    const upcomingExams7dCount = upcomingEvents.filter(
      (e) => e.kind === 'exam',
    ).length;
    const upcomingAssignments7dCount =
      upcomingEvents.length - upcomingExams7dCount;
    const liveExamsCount = upcomingEvents.filter(
      (e) => e.kind === 'exam' && e.isLive,
    ).length;

    return {
      summary: {
        activeClassCount: classesSummary.activeClassCount,
        endedClassCount: classesSummary.endedClassCount,
        totalStudents: classesSummary.totalStudents,
        activeStudents7dCount: classesSummary.activeStudents7dCount,
        pendingGradingCount:
          gradingOverview.pendingExamsCount +
          gradingOverview.pendingAssignmentsCount,
        pendingExamsCount: gradingOverview.pendingExamsCount,
        pendingAssignmentsCount: gradingOverview.pendingAssignmentsCount,
        oldestPendingSubmittedAt: gradingOverview.oldestPendingSubmittedAt,
        overdueGrading48hCount: gradingOverview.overdueGrading48hCount,
        submissionRatePercent,
        submittedCount: classesSummary.submittedCount,
        expectedSubmissionCount: classesSummary.expectedSubmissionCount,
        upcoming7dCount: upcomingEvents.length,
        upcomingExams7dCount,
        upcomingAssignments7dCount,
        liveExamsCount,
      },
      attention: {
        overdueGrading48hCount: gradingOverview.overdueGrading48hCount,
        lowSubmissionAssignments: lowSubmissionAssignments.items,
        lowSubmissionAssignmentsCount: lowSubmissionAssignments.totalCount,
        unconfiguredClasses: unconfiguredAll.slice(0, ATTENTION_LIMIT),
        unconfiguredClassesCount: unconfiguredAll.length,
      },
      trends: {
        days: trendDays,
        submissionsByDay,
      },
      upcomingEvents,
      classes: classesSummary.classes,
      gradingQueue: gradingOverview.gradingQueue,
      scoreDistribution: buildScoreDistribution(
        analyticsAndAtRisk.scoreBuckets,
      ),
      atRiskStudents: analyticsAndAtRisk.atRiskStudents,
    };
  }
}
