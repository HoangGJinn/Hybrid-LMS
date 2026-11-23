import { Injectable } from '@nestjs/common';
import {
  AdminStatsRepository,
  type SemesterRow,
} from '../repositories/admin-stats.repository.js';
import type {
  ActiveSemesterOverview,
  AdminDashboardOverview,
  AdminDashboardTrends,
} from '../types/admin-dashboard-overview.type.js';

export const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export const ALLOWED_TREND_DAYS = [7, 14, 30] as const;
export const DEFAULT_TREND_DAYS = 14;
const HOURLY_WINDOW_DAYS = 7;

const toVietnamDateKey = (date: Date): string =>
  new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

const getStartOfVietnamDay = (now: Date): Date => {
  const vnTime = new Date(now.getTime() + VN_OFFSET_MS);
  vnTime.setUTCHours(0, 0, 0, 0);
  return new Date(vnTime.getTime() - VN_OFFSET_MS);
};

const buildSemesterOverview = (
  semester: SemesterRow | null,
  now: Date,
): ActiveSemesterOverview | null => {
  if (!semester) return null;
  const startMs = new Date(semester.startDate).getTime();
  const endMs = new Date(semester.endDate).getTime();
  const nowMs = now.getTime();
  const totalMs = Math.max(1, endMs - startMs);
  const rawProgress = ((nowMs - startMs) / totalMs) * 100;
  const progressPercent = Math.min(100, Math.max(0, Math.round(rawProgress)));
  const daysRemaining = Math.max(0, Math.ceil((endMs - nowMs) / DAY_MS));

  return {
    id: semester.id,
    semesterCode: semester.semesterCode,
    name: semester.name,
    startDate: new Date(semester.startDate),
    endDate: new Date(semester.endDate),
    progressPercent,
    daysRemaining,
  };
};

const normalizeTrendDays = (days: number | undefined): number =>
  (ALLOWED_TREND_DAYS as readonly number[]).includes(days ?? -1)
    ? (days as number)
    : DEFAULT_TREND_DAYS;

@Injectable()
export class AdminStatsService {
  constructor(private readonly statsRepo: AdminStatsRepository) {}

  async getOverview(
    now: Date = new Date(),
    days?: number,
  ): Promise<AdminDashboardOverview> {
    const trendDays = normalizeTrendDays(days);
    const onlineCutoff = new Date(now.getTime() - ONLINE_WINDOW_MS);
    const last24hCutoff = new Date(now.getTime() - DAY_MS);
    const startOfToday = getStartOfVietnamDay(now);

    const semester = await this.statsRepo.findCurrentOrLatestSemester(now);

    const [
      classes,
      students,
      lecturers,
      trafficCounts,
      onlineUsers,
      emptyActiveClasses,
      classesWithInactiveLecturer,
      subjectDistribution,
      trends,
    ] = await Promise.all([
      this.statsRepo.getClassStats(semester?.id ?? null),
      this.statsRepo.getStudentStats(),
      this.statsRepo.getLecturerStats(),
      this.statsRepo.getTrafficStats(onlineCutoff, startOfToday, last24hCutoff),
      this.statsRepo.findOnlineUsers(onlineCutoff),
      this.statsRepo.findEmptyActiveClasses(),
      this.statsRepo.findClassesWithInactiveLecturer(),
      this.statsRepo.findSubjectDistribution(),
      this.buildTrends(startOfToday, trendDays),
    ]);

    return {
      classes,
      students,
      lecturers,
      activeSemester: buildSemesterOverview(semester, now),
      traffic: {
        ...trafficCounts,
        onlineUsers,
      },
      attention: {
        emptyActiveClasses: emptyActiveClasses.items,
        emptyActiveClassesCount: emptyActiveClasses.totalCount,
        classesWithInactiveLecturer: classesWithInactiveLecturer.items,
        classesWithInactiveLecturerCount:
          classesWithInactiveLecturer.totalCount,
      },
      subjectDistribution,
      trends,
    };
  }

  /** Builds zero-filled daily and hourly series so charts never have gaps. */
  private async buildTrends(
    startOfToday: Date,
    days: number,
  ): Promise<AdminDashboardTrends> {
    const dailyFrom = new Date(startOfToday.getTime() - (days - 1) * DAY_MS);
    const hourlyFrom = new Date(
      startOfToday.getTime() - (HOURLY_WINDOW_DAYS - 1) * DAY_MS,
    );
    const [dailyRows, hourlyRows] = await Promise.all([
      this.statsRepo.findDailyLoginTrend(dailyFrom),
      this.statsRepo.findHourlyActivity(hourlyFrom),
    ]);

    const byDate = new Map(dailyRows.map((row) => [row.date, row]));
    const loginsByDay = Array.from({ length: days }, (_, index) => {
      const date = toVietnamDateKey(
        new Date(dailyFrom.getTime() + index * DAY_MS),
      );
      const row = byDate.get(date);
      return {
        date,
        succeeded: row?.succeeded ?? 0,
        failed: row?.failed ?? 0,
        activeUsers: row?.activeUsers ?? 0,
      };
    });

    const byHour = new Map(hourlyRows.map((row) => [row.hour, row.count]));
    const activityByHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: byHour.get(hour) ?? 0,
    }));

    return { days, loginsByDay, activityByHour };
  }
}
