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

export interface UsersAndPresenceOverviewRow {
  readonly students: StudentOverviewStats;
  readonly lecturers: LecturerOverviewStats;
  readonly onlineNowCount: number;
  readonly activeUsersTodayCount: number;
  readonly onlineUsers: OnlineUserView[];
}

export interface AcademicOverviewRow {
  readonly semester: SemesterRow | null;
  readonly classes: ClassOverviewStats;
  readonly emptyActiveClasses: AttentionClassResult;
  readonly classesWithInactiveLecturer: AttentionClassResult;
  readonly subjectDistribution: SubjectDistributionItem[];
}

export interface AuditOverviewRow {
  readonly loginsTodayCount: number;
  readonly failedLogins24hCount: number;
  readonly dailyLoginTrend: DailyLoginRow[];
  readonly hourlyActivity: HourlyActivityPoint[];
}

const toDate = (v: Date | string): Date =>
  v instanceof Date ? v : new Date(v);

@Injectable()
export class AdminStatsRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  /** Aggregates student/lecturer counts, online counts, and active user list in one scan of `users`. */
  async getUsersAndPresenceOverview(
    onlineCutoff: Date,
    startOfToday: Date,
    onlineLimit = 50,
  ): Promise<UsersAndPresenceOverviewRow> {
    const rows = (await this.repo.manager.query(
      `WITH user_profiles AS (
         SELECT
           u.id,
           u.full_name AS "fullName",
           u.email,
           u.avatar_url AS "avatarUrl",
           u.role::text AS role,
           u.is_active AS "isActive",
           u.sso_id AS "ssoId",
           u.last_seen_at AS "lastSeenAt",
           s.student_code AS "studentCode",
           s.status::text AS "studentStatus",
           l.lecturer_code AS "lecturerCode",
           l.status::text AS "lecturerStatus"
         FROM users u
         LEFT JOIN students s ON s.user_id = u.id
         LEFT JOIN lecturers l ON l.user_id = u.id
         WHERE u.deleted_at IS NULL
       ),
       student_stats AS (
         SELECT
           COUNT(*)::int AS "totalCount",
           COUNT(*) FILTER (WHERE "isActive" = true AND "studentStatus" = 'STUDYING')::int AS "studyingCount",
           COUNT(*) FILTER (WHERE "isActive" = true AND "ssoId" IS NULL)::int AS "pendingCount",
           COUNT(*) FILTER (WHERE "isActive" = false)::int AS "inactiveCount"
         FROM user_profiles
         WHERE role = 'STUDENT'
       ),
       lecturer_stats AS (
         SELECT
           COUNT(*)::int AS "totalCount",
           COUNT(*) FILTER (WHERE "isActive" = true AND "lecturerStatus" = 'WORKING')::int AS "workingCount",
           COUNT(*) FILTER (WHERE "isActive" = true AND "ssoId" IS NULL)::int AS "pendingCount",
           COUNT(*) FILTER (WHERE "isActive" = false)::int AS "inactiveCount"
         FROM user_profiles
         WHERE role = 'LECTURER'
       ),
       presence_counts AS (
         SELECT
           COUNT(*) FILTER (WHERE "isActive" = true AND "lastSeenAt" >= $1)::int AS "onlineNowCount",
           COUNT(*) FILTER (WHERE "isActive" = true AND "lastSeenAt" >= $2)::int AS "activeUsersTodayCount"
         FROM user_profiles
       ),
       online_list AS (
         SELECT
           id,
           "fullName",
           email,
           "avatarUrl",
           role,
           COALESCE("studentCode", "lecturerCode") AS code,
           "lastSeenAt"
         FROM user_profiles
         WHERE "isActive" = true AND "lastSeenAt" >= $1
         ORDER BY "lastSeenAt" DESC
         LIMIT $3
       )
       SELECT
         (SELECT row_to_json(ss) FROM student_stats ss) AS students,
         (SELECT row_to_json(ls) FROM lecturer_stats ls) AS lecturers,
         pc."onlineNowCount",
         pc."activeUsersTodayCount",
         COALESCE(
           (SELECT json_agg(ol ORDER BY ol."lastSeenAt" DESC) FROM online_list ol),
           '[]'::json
         ) AS "onlineUsers"
       FROM presence_counts pc`,
      [onlineCutoff, startOfToday, onlineLimit],
    )) as Array<
      Omit<UsersAndPresenceOverviewRow, 'onlineUsers'> & {
        onlineUsers: Array<
          Omit<OnlineUserView, 'lastSeenAt'> & { lastSeenAt: Date | string }
        >;
      }
    >;

    const row = rows[0];
    if (!row) {
      return {
        students: {
          totalCount: 0,
          studyingCount: 0,
          pendingCount: 0,
          inactiveCount: 0,
        },
        lecturers: {
          totalCount: 0,
          workingCount: 0,
          pendingCount: 0,
          inactiveCount: 0,
        },
        onlineNowCount: 0,
        activeUsersTodayCount: 0,
        onlineUsers: [],
      };
    }

    return {
      ...row,
      onlineUsers: row.onlineUsers.map((u) => ({
        ...u,
        lastSeenAt: toDate(u.lastSeenAt),
      })),
    };
  }

  /** Aggregates semester progress, class counts, attention classes, and subject distribution in one round-trip. */
  async getAcademicOverview(
    now: Date,
    attentionLimit = 6,
    subjectLimit = 6,
  ): Promise<AcademicOverviewRow> {
    const rows = (await this.repo.manager.query(
      `WITH active_sem AS (
         SELECT id, semester_code AS "semesterCode", name, start_date AS "startDate", end_date AS "endDate"
         FROM semesters
         WHERE start_date <= $1 AND end_date >= $1
         ORDER BY start_date DESC
         LIMIT 1
       ),
       fallback_sem AS (
         SELECT id, semester_code AS "semesterCode", name, start_date AS "startDate", end_date AS "endDate"
         FROM semesters
         ORDER BY
           CASE WHEN start_date > $1 THEN 0 ELSE 1 END ASC,
           ABS(EXTRACT(EPOCH FROM (start_date - $1))) ASC
         LIMIT 1
       ),
       target_semester AS (
         SELECT * FROM active_sem
         UNION ALL
         SELECT * FROM fallback_sem WHERE NOT EXISTS (SELECT 1 FROM active_sem)
         LIMIT 1
       ),
       class_stats AS (
         SELECT
           COUNT(*) FILTER (WHERE c.is_active = true)::int AS "activeCount",
           COUNT(*) FILTER (WHERE c.is_active = false)::int AS "endedCount",
           COUNT(*) FILTER (WHERE c.is_active = true AND ts.id IS NOT NULL AND c.semester_id = ts.id)::int AS "currentSemesterCount"
         FROM classes c
         LEFT JOIN target_semester ts ON true
         WHERE c.deleted_at IS NULL
       ),
       empty_all AS (
         SELECT
           c.id,
           c.class_code AS "classCode",
           c.name,
           COALESCE(lu.full_name, '') AS "lecturerName"
         FROM classes c
         LEFT JOIN lecturers l ON l.user_id = c.lecturer_id
         LEFT JOIN users lu ON lu.id = l.user_id
         LEFT JOIN class_students cs ON cs.class_id = c.id
         WHERE c.deleted_at IS NULL AND c.is_active = true
         GROUP BY c.id, c.class_code, c.name, lu.full_name
         HAVING COUNT(cs.student_id) = 0
         ORDER BY c.class_code ASC
       ),
       empty_limited AS (
         SELECT * FROM empty_all LIMIT $2
       ),
       inactive_lec_all AS (
         SELECT
           c.id,
           c.class_code AS "classCode",
           c.name,
           COALESCE(lu.full_name, '') AS "lecturerName"
         FROM classes c
         INNER JOIN lecturers l ON l.user_id = c.lecturer_id
         INNER JOIN users lu ON lu.id = l.user_id
         WHERE c.deleted_at IS NULL
           AND c.is_active = true
           AND (lu.deleted_at IS NOT NULL OR lu.is_active = false OR l.status::text <> 'WORKING')
         ORDER BY c.class_code ASC
       ),
       inactive_lec_limited AS (
         SELECT * FROM inactive_lec_all LIMIT $2
       ),
       subject_dist AS (
         SELECT
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
         LIMIT $3
       )
       SELECT
         (SELECT row_to_json(ts) FROM target_semester ts) AS semester,
         (SELECT row_to_json(cs) FROM class_stats cs) AS classes,
         COALESCE((SELECT json_agg(el ORDER BY el."classCode" ASC) FROM empty_limited el), '[]'::json) AS "emptyItems",
         (SELECT COUNT(*)::int FROM empty_all) AS "emptyTotalCount",
         COALESCE((SELECT json_agg(il ORDER BY il."classCode" ASC) FROM inactive_lec_limited il), '[]'::json) AS "inactiveLecItems",
         (SELECT COUNT(*)::int FROM inactive_lec_all) AS "inactiveLecTotalCount",
         COALESCE((SELECT json_agg(sd) FROM subject_dist sd), '[]'::json) AS "subjectDistribution"`,
      [now, attentionLimit, subjectLimit],
    )) as Array<{
      semester:
        | (Omit<SemesterRow, 'startDate' | 'endDate'> & {
            startDate: Date | string;
            endDate: Date | string;
          })
        | null;
      classes: ClassOverviewStats;
      emptyItems: AttentionClassItem[];
      emptyTotalCount: number;
      inactiveLecItems: AttentionClassItem[];
      inactiveLecTotalCount: number;
      subjectDistribution: SubjectDistributionItem[];
    }>;

    const row = rows[0];
    if (!row) {
      return {
        semester: null,
        classes: { activeCount: 0, endedCount: 0, currentSemesterCount: 0 },
        emptyActiveClasses: { items: [], totalCount: 0 },
        classesWithInactiveLecturer: { items: [], totalCount: 0 },
        subjectDistribution: [],
      };
    }

    return {
      semester: row.semester
        ? {
            ...row.semester,
            startDate: toDate(row.semester.startDate),
            endDate: toDate(row.semester.endDate),
          }
        : null,
      classes: row.classes,
      emptyActiveClasses: {
        items: row.emptyItems,
        totalCount: row.emptyTotalCount,
      },
      classesWithInactiveLecturer: {
        items: row.inactiveLecItems,
        totalCount: row.inactiveLecTotalCount,
      },
      subjectDistribution: row.subjectDistribution,
    };
  }

  /** Aggregates login counts, daily trend, and hourly activity using a bounded `occurred_at` range scan. */
  async getAuditOverview(
    startOfToday: Date,
    last24hCutoff: Date,
    dailyFrom: Date,
    hourlyFrom: Date,
  ): Promise<AuditOverviewRow> {
    const rows = (await this.repo.manager.query(
      `WITH recent_logs AS (
         SELECT occurred_at, action, category, result, actor_id
         FROM audit_logs
         WHERE occurred_at >= LEAST($1::timestamptz, $2::timestamptz, $3::timestamptz, $4::timestamptz)
       ),
       traffic_counts AS (
         SELECT
           COUNT(*) FILTER (WHERE action = 'LOGIN_SUCCEEDED' AND occurred_at >= $1)::int AS "loginsTodayCount",
           COUNT(*) FILTER (WHERE category = 'SECURITY' AND result = 'FAILURE' AND occurred_at >= $2)::int AS "failedLogins24hCount"
         FROM recent_logs
       ),
       daily_trend AS (
         SELECT
           to_char(occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS date,
           COUNT(*) FILTER (WHERE action = 'LOGIN_SUCCEEDED')::int AS succeeded,
           COUNT(*) FILTER (WHERE category = 'SECURITY' AND result = 'FAILURE')::int AS failed,
           COUNT(DISTINCT actor_id) FILTER (WHERE actor_id IS NOT NULL AND result = 'SUCCESS')::int AS "activeUsers"
         FROM recent_logs
         WHERE occurred_at >= $3
         GROUP BY 1
         ORDER BY 1 ASC
       ),
       hourly_activity AS (
         SELECT
           EXTRACT(HOUR FROM occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS hour,
           COUNT(*)::int AS count
         FROM recent_logs
         WHERE occurred_at >= $4
         GROUP BY 1
         ORDER BY 1 ASC
       )
       SELECT
         tc."loginsTodayCount",
         tc."failedLogins24hCount",
         COALESCE((SELECT json_agg(dt ORDER BY dt.date ASC) FROM daily_trend dt), '[]'::json) AS "dailyLoginTrend",
         COALESCE((SELECT json_agg(ha ORDER BY ha.hour ASC) FROM hourly_activity ha), '[]'::json) AS "hourlyActivity"
       FROM traffic_counts tc`,
      [startOfToday, last24hCutoff, dailyFrom, hourlyFrom],
    )) as AuditOverviewRow[];

    return (
      rows[0] ?? {
        loginsTodayCount: 0,
        failedLogins24hCount: 0,
        dailyLoginTrend: [],
        hourlyActivity: [],
      }
    );
  }
}
