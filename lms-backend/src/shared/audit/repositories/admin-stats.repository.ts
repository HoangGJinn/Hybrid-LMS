import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity.js';
import type {
  AttentionClassItem,
  ClassOverviewStats,
  HourlyActivityPoint,
  LecturerOverviewStats,
  OnlineUserView,
  StudentOverviewStats,
  SubjectDistributionItem,
} from '../types/admin-dashboard-overview.type.js';

export interface SemesterRow {
  readonly id: string;
  readonly semesterCode: string;
  readonly name: string;
  readonly startDate: Date;
  readonly endDate: Date;
}

export interface DailyLoginRow {
  readonly date: string;
  readonly succeeded: number;
  readonly failed: number;
  readonly activeUsers: number;
}

export interface AttentionClassResult {
  readonly items: AttentionClassItem[];
  readonly totalCount: number;
}

export interface TrafficCountsRow {
  readonly onlineNowCount: number;
  readonly activeUsersTodayCount: number;
  readonly loginsTodayCount: number;
  readonly failedLogins24hCount: number;
}

@Injectable()
export class AdminStatsRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async findCurrentOrLatestSemester(now: Date): Promise<SemesterRow | null> {
    const activeRows = (await this.repo.manager.query(
      `SELECT id, semester_code AS "semesterCode", name, start_date AS "startDate", end_date AS "endDate"
       FROM semesters
       WHERE start_date <= $1 AND end_date >= $1
       ORDER BY start_date DESC
       LIMIT 1`,
      [now],
    )) as SemesterRow[];
    if (activeRows[0]) return activeRows[0];

    const upcomingOrLatest = (await this.repo.manager.query(
      `SELECT id, semester_code AS "semesterCode", name, start_date AS "startDate", end_date AS "endDate"
       FROM semesters
       ORDER BY
         CASE WHEN start_date > $1 THEN 0 ELSE 1 END ASC,
         ABS(EXTRACT(EPOCH FROM (start_date - $1))) ASC
       LIMIT 1`,
      [now],
    )) as SemesterRow[];
    return upcomingOrLatest[0] ?? null;
  }

  async getClassStats(semesterId: string | null): Promise<ClassOverviewStats> {
    const rows = (await this.repo.manager.query(
      `SELECT
         COUNT(*) FILTER (WHERE is_active = true)::int AS "activeCount",
         COUNT(*) FILTER (WHERE is_active = false)::int AS "endedCount",
         COUNT(*) FILTER (WHERE is_active = true AND ($1::uuid IS NOT NULL AND semester_id = $1::uuid))::int AS "currentSemesterCount"
       FROM classes
       WHERE deleted_at IS NULL`,
      [semesterId],
    )) as ClassOverviewStats[];
    return rows[0] ?? { activeCount: 0, endedCount: 0, currentSemesterCount: 0 };
  }

  async getStudentStats(): Promise<StudentOverviewStats> {
    const rows = (await this.repo.manager.query(
      `SELECT
         COUNT(*)::int AS "totalCount",
         COUNT(*) FILTER (WHERE u.is_active = true AND s.status::text = 'STUDYING')::int AS "studyingCount",
         COUNT(*) FILTER (WHERE u.is_active = true AND u.sso_id IS NULL)::int AS "pendingCount",
         COUNT(*) FILTER (WHERE u.is_active = false)::int AS "inactiveCount"
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.role = 'STUDENT' AND u.deleted_at IS NULL`,
    )) as StudentOverviewStats[];
    return (
      rows[0] ?? {
        totalCount: 0,
        studyingCount: 0,
        pendingCount: 0,
        inactiveCount: 0,
      }
    );
  }

  async getLecturerStats(): Promise<LecturerOverviewStats> {
    const rows = (await this.repo.manager.query(
      `SELECT
         COUNT(*)::int AS "totalCount",
         COUNT(*) FILTER (WHERE u.is_active = true AND l.status::text = 'WORKING')::int AS "workingCount",
         COUNT(*) FILTER (WHERE u.is_active = true AND u.sso_id IS NULL)::int AS "pendingCount",
         COUNT(*) FILTER (WHERE u.is_active = false)::int AS "inactiveCount"
       FROM users u
       LEFT JOIN lecturers l ON l.user_id = u.id
       WHERE u.role = 'LECTURER' AND u.deleted_at IS NULL`,
    )) as LecturerOverviewStats[];
    return (
      rows[0] ?? {
        totalCount: 0,
        workingCount: 0,
        pendingCount: 0,
        inactiveCount: 0,
      }
    );
  }

  async getTrafficStats(
    onlineCutoff: Date,
    startOfToday: Date,
    last24hCutoff: Date,
  ): Promise<TrafficCountsRow> {
    const [userRows, auditRows] = await Promise.all([
      this.repo.manager.query(
        `SELECT
           COUNT(*) FILTER (WHERE last_seen_at >= $1)::int AS "onlineNowCount",
           COUNT(*) FILTER (WHERE last_seen_at >= $2)::int AS "activeUsersTodayCount"
         FROM users
         WHERE deleted_at IS NULL AND is_active = true`,
        [onlineCutoff, startOfToday],
      ) as Promise<Array<{ onlineNowCount: number; activeUsersTodayCount: number }>>,
      this.repo.manager.query(
        `SELECT
           COUNT(*) FILTER (WHERE action = 'LOGIN_SUCCEEDED' AND occurred_at >= $1)::int AS "loginsTodayCount",
           COUNT(*) FILTER (WHERE category = 'SECURITY' AND result = 'FAILURE' AND occurred_at >= $2)::int AS "failedLogins24hCount"
         FROM audit_logs`,
        [startOfToday, last24hCutoff],
      ) as Promise<Array<{ loginsTodayCount: number; failedLogins24hCount: number }>>,
    ]);
    return {
      onlineNowCount: userRows[0]?.onlineNowCount ?? 0,
      activeUsersTodayCount: userRows[0]?.activeUsersTodayCount ?? 0,
      loginsTodayCount: auditRows[0]?.loginsTodayCount ?? 0,
      failedLogins24hCount: auditRows[0]?.failedLogins24hCount ?? 0,
    };
  }

  async findOnlineUsers(
    onlineCutoff: Date,
    limit = 50,
  ): Promise<OnlineUserView[]> {
    return (await this.repo.manager.query(
      `SELECT
         u.id,
         u.full_name AS "fullName",
         u.email,
         u.avatar_url AS "avatarUrl",
         u.role::text AS role,
         COALESCE(s.student_code, l.lecturer_code) AS code,
         u.last_seen_at AS "lastSeenAt"
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN lecturers l ON l.user_id = u.id
       WHERE u.deleted_at IS NULL
         AND u.is_active = true
         AND u.last_seen_at >= $1
       ORDER BY u.last_seen_at DESC
       LIMIT $2`,
      [onlineCutoff, limit],
    )) as OnlineUserView[];
  }

  async findEmptyActiveClasses(limit = 6): Promise<AttentionClassResult> {
    const rows = (await this.repo.manager.query(
      `SELECT
         c.id,
         c.class_code AS "classCode",
         c.name,
         COALESCE(lu.full_name, '') AS "lecturerName",
         COUNT(*) OVER()::int AS "totalCount"
       FROM classes c
       LEFT JOIN lecturers l ON l.user_id = c.lecturer_id
       LEFT JOIN users lu ON lu.id = l.user_id
       LEFT JOIN class_students cs ON cs.class_id = c.id
       WHERE c.deleted_at IS NULL AND c.is_active = true
       GROUP BY c.id, c.class_code, c.name, lu.full_name
       HAVING COUNT(cs.student_id) = 0
       ORDER BY c.class_code ASC
       LIMIT $1`,
      [limit],
    )) as Array<AttentionClassItem & { totalCount: number }>;
    return {
      items: rows.map(({ totalCount: _total, ...item }) => item),
      totalCount: rows[0]?.totalCount ?? 0,
    };
  }

  async findClassesWithInactiveLecturer(
    limit = 6,
  ): Promise<AttentionClassResult> {
    const rows = (await this.repo.manager.query(
      `SELECT
         c.id,
         c.class_code AS "classCode",
         c.name,
         COALESCE(lu.full_name, '') AS "lecturerName",
         COUNT(*) OVER()::int AS "totalCount"
       FROM classes c
       INNER JOIN lecturers l ON l.user_id = c.lecturer_id
       INNER JOIN users lu ON lu.id = l.user_id
       WHERE c.deleted_at IS NULL
         AND c.is_active = true
         AND (lu.deleted_at IS NOT NULL OR lu.is_active = false OR l.status::text <> 'WORKING')
       ORDER BY c.class_code ASC
       LIMIT $1`,
      [limit],
    )) as Array<AttentionClassItem & { totalCount: number }>;
    return {
      items: rows.map(({ totalCount: _total, ...item }) => item),
      totalCount: rows[0]?.totalCount ?? 0,
    };
  }

  async findSubjectDistribution(
    limit = 6,
  ): Promise<SubjectDistributionItem[]> {
    return (await this.repo.manager.query(
      `SELECT
         sub.id AS "subjectId",
         sub.subject_code AS "subjectCode",
         sub.name AS "subjectName",
         COUNT(DISTINCT c.id)::int AS "activeClassCount",
         COUNT(cs.student_id)::int AS "enrolledStudentCount"
       FROM subjects sub
       INNER JOIN classes c ON c.subject_id = sub.id AND c.deleted_at IS NULL AND c.is_active = true
       LEFT JOIN class_students cs ON cs.class_id = c.id
       GROUP BY sub.id, sub.subject_code, sub.name
       ORDER BY "activeClassCount" DESC, "enrolledStudentCount" DESC, sub.subject_code ASC
       LIMIT $1`,
      [limit],
    )) as SubjectDistributionItem[];
  }

  /** Per-day login counts and distinct active actors, grouped in Asia/Ho_Chi_Minh. */
  async findDailyLoginTrend(from: Date): Promise<DailyLoginRow[]> {
    return (await this.repo.manager.query(
      `SELECT
         to_char(occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS "date",
         COUNT(*) FILTER (WHERE action = 'LOGIN_SUCCEEDED')::int AS "succeeded",
         COUNT(*) FILTER (WHERE category = 'SECURITY' AND result = 'FAILURE')::int AS "failed",
         COUNT(DISTINCT actor_id) FILTER (WHERE actor_id IS NOT NULL AND result = 'SUCCESS')::int AS "activeUsers"
       FROM audit_logs
       WHERE occurred_at >= $1
       GROUP BY 1
       ORDER BY 1 ASC`,
      [from],
    )) as DailyLoginRow[];
  }

  /** Audit events per hour of day (0..23) in Asia/Ho_Chi_Minh since `from`. */
  async findHourlyActivity(from: Date): Promise<HourlyActivityPoint[]> {
    return (await this.repo.manager.query(
      `SELECT
         EXTRACT(HOUR FROM occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS "hour",
         COUNT(*)::int AS "count"
       FROM audit_logs
       WHERE occurred_at >= $1
       GROUP BY 1
       ORDER BY 1 ASC`,
      [from],
    )) as HourlyActivityPoint[];
  }
}
