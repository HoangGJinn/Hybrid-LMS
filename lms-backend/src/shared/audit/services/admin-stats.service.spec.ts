import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminStatsRepository } from '../repositories/admin-stats.repository.js';
import { AdminStatsService } from './admin-stats.service.js';

describe('AdminStatsService', () => {
  let service: AdminStatsService;
  let mockRepo: Partial<
    Record<keyof AdminStatsRepository, ReturnType<typeof vi.fn>>
  >;

  beforeEach(() => {
    mockRepo = {
      getUsersAndPresenceOverview: vi.fn().mockResolvedValue({
        students: {
          totalCount: 200,
          studyingCount: 185,
          pendingCount: 10,
          inactiveCount: 5,
        },
        lecturers: {
          totalCount: 20,
          workingCount: 18,
          pendingCount: 2,
          inactiveCount: 0,
        },
        onlineNowCount: 7,
        activeUsersTodayCount: 45,
        onlineUsers: [
          {
            id: 'u1',
            fullName: 'Nguyen Van A',
            email: 'a@school.edu.vn',
            avatarUrl: null,
            role: 'STUDENT',
            code: 'SV26000001',
            lastSeenAt: new Date('2026-11-23T11:59:00Z'),
          },
        ],
      }),
      getAcademicOverview: vi.fn().mockResolvedValue({
        semester: {
          id: 'sem-1',
          semesterCode: 'HK1-2026',
          name: 'Học kỳ 1 - 2026',
          startDate: new Date('2026-11-01T00:00:00Z'),
          endDate: new Date('2026-12-01T00:00:00Z'),
        },
        classes: {
          activeCount: 12,
          endedCount: 4,
          currentSemesterCount: 10,
        },
        emptyActiveClasses: { items: [], totalCount: 0 },
        classesWithInactiveLecturer: { items: [], totalCount: 0 },
        subjectDistribution: [
          {
            subjectId: 'sub-1',
            subjectCode: 'CS101',
            subjectName: 'Intro to CS',
            activeClassCount: 4,
            enrolledStudentCount: 120,
          },
        ],
      }),
      getAuditOverview: vi.fn().mockResolvedValue({
        loginsTodayCount: 52,
        failedLogins24hCount: 3,
        dailyLoginTrend: [
          { date: '2026-11-16', succeeded: 5, failed: 1, activeUsers: 4 },
        ],
        hourlyActivity: [{ hour: 9, count: 12 }],
      }),
    };
    service = new AdminStatsService(
      mockRepo as unknown as AdminStatsRepository,
    );
  });

  it('aggregates overview stats and calculates semester progress and days remaining', async () => {
    const now = new Date('2026-11-16T00:00:00Z');
    const overview = await service.getOverview(now);

    expect(overview.classes.activeCount).toBe(12);
    expect(overview.students.totalCount).toBe(200);
    expect(overview.traffic.onlineNowCount).toBe(7);
    expect(overview.traffic.loginsTodayCount).toBe(52);
    expect(overview.traffic.onlineUsers).toHaveLength(1);
    expect(overview.activeSemester).toMatchObject({
      id: 'sem-1',
      semesterCode: 'HK1-2026',
      progressPercent: 50,
      daysRemaining: 15,
    });
    expect(overview.subjectDistribution).toHaveLength(1);
  });

  it('returns activeSemester as null when no semesters exist', async () => {
    mockRepo.getAcademicOverview!.mockResolvedValue({
      semester: null,
      classes: { activeCount: 0, endedCount: 0, currentSemesterCount: 0 },
      emptyActiveClasses: { items: [], totalCount: 0 },
      classesWithInactiveLecturer: { items: [], totalCount: 0 },
      subjectDistribution: [],
    });

    const overview = await service.getOverview(new Date('2026-11-16T00:00:00Z'));

    expect(overview.activeSemester).toBeNull();
    expect(overview.classes.currentSemesterCount).toBe(0);
  });

  it('zero-fills daily and hourly trends', async () => {
    const overview = await service.getOverview(
      new Date('2026-11-16T05:00:00Z'),
      7,
    );

    expect(overview.trends.days).toBe(7);
    expect(overview.trends.loginsByDay).toHaveLength(7);
    expect(overview.trends.loginsByDay.at(-1)).toEqual({
      date: '2026-11-16',
      succeeded: 5,
      failed: 1,
      activeUsers: 4,
    });
    expect(overview.trends.loginsByDay[0]).toMatchObject({
      date: '2026-11-10',
      succeeded: 0,
    });
    expect(overview.trends.activityByHour).toHaveLength(24);
    expect(overview.trends.activityByHour[9]).toEqual({ hour: 9, count: 12 });
    expect(overview.trends.activityByHour[10]).toEqual({ hour: 10, count: 0 });
  });

  it('falls back to 14 days for unsupported windows', async () => {
    const overview = await service.getOverview(
      new Date('2026-11-16T05:00:00Z'),
      99,
    );
    expect(overview.trends.days).toBe(14);
    expect(overview.trends.loginsByDay).toHaveLength(14);
  });
});
