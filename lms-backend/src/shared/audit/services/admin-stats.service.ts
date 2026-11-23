import { Injectable } from '@nestjs/common';
import {
  AdminStatsRepository,
  type DailyLoginRow,
  type SemesterRow,
} from '../repositories/admin-stats.repository.js';
import type {
  ActiveSemesterOverview,
  AdminDashboardOverview,
  AdminDashboardTrends,
  HourlyActivityPoint,
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

const buildTrends = (
  dailyRows: DailyLoginRow[],
  hourlyRows: HourlyActivityPoint[],
  dailyFrom: Date,
  days: number,
): AdminDashboardTrends => {
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
};

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
    const dailyFrom = new Date(
      startOfToday.getTime() - (trendDays - 1) * DAY_MS,
    );
    const hourlyFrom = new Date(
      startOfToday.getTime() - (HOURLY_WINDOW_DAYS - 1) * DAY_MS,
    );

    const [usersOverview, academicOverview, auditOverview] = await Promise.all([
      this.statsRepo.getUsersAndPresenceOverview(onlineCutoff, startOfToday),
      this.statsRepo.getAcademicOverview(now),
      this.statsRepo.getAuditOverview(
        startOfToday,
        last24hCutoff,
        dailyFrom,
        hourlyFrom,
      ),
    ]);

    return {
      classes: academicOverview.classes,
      students: usersOverview.students,
      lecturers: usersOverview.lecturers,
      activeSemester: buildSemesterOverview(academicOverview.semester, now),
      traffic: {
        onlineNowCount: usersOverview.onlineNowCount,
        activeUsersTodayCount: usersOverview.activeUsersTodayCount,
        loginsTodayCount: auditOverview.loginsTodayCount,
        failedLogins24hCount: auditOverview.failedLogins24hCount,
        onlineUsers: usersOverview.onlineUsers,
      },
      attention: {
        emptyActiveClasses: academicOverview.emptyActiveClasses.items,
        emptyActiveClassesCount: academicOverview.emptyActiveClasses.totalCount,
        classesWithInactiveLecturer:
          academicOverview.classesWithInactiveLecturer.items,
        classesWithInactiveLecturerCount:
          academicOverview.classesWithInactiveLecturer.totalCount,
      },
      subjectDistribution: academicOverview.subjectDistribution,
      trends: buildTrends(
        auditOverview.dailyLoginTrend,
        auditOverview.hourlyActivity,
        dailyFrom,
        trendDays,
      ),
    };
  }
}
