import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import type {
  LecturerAtRiskStudentItem,
  LecturerClassHealthItem,
  LecturerGradingQueueItem,
  LecturerSubmissionTrendPoint,
  ScoreBucketLabel,
} from '../types/lecturer-dashboard-overview.type.js';

export interface LecturerClassesAndSummaryResult {
  readonly activeClassCount: number;
  readonly endedClassCount: number;
  readonly totalStudents: number;
  readonly activeStudents7dCount: number;
  readonly submittedCount: number;
  readonly expectedSubmissionCount: number;
  readonly classes: LecturerClassHealthItem[];
}

export interface LecturerScheduleCandidateRow {
  readonly id: string;
  readonly kind: 'exam' | 'assignment';
  readonly sourceId: string;
  readonly classId: string;
  readonly classCode: string;
  readonly className: string;
  readonly title: string;
  readonly startAt: Date;
  readonly endAt: Date;
  readonly durationMinutes: number | null;
  readonly isLive: boolean;
  readonly submittedCount: number;
  readonly studentCount: number;
}

export interface LecturerGradingOverviewResult {
  readonly pendingExamsCount: number;
  readonly pendingAssignmentsCount: number;
  readonly overdueGrading48hCount: number;
  readonly oldestPendingSubmittedAt: Date | null;
  readonly gradingQueue: LecturerGradingQueueItem[];
}

export interface LecturerScoreBucketRow {
  readonly classId: string;
  readonly bucket: ScoreBucketLabel;
  readonly count: number;
}

export interface LecturerAnalyticsAndAtRiskResult {
  readonly trend: LecturerSubmissionTrendPoint[];
  readonly scoreBuckets: LecturerScoreBucketRow[];
  readonly atRiskStudents: LecturerAtRiskStudentItem[];
}

@Injectable()
export class LecturerDashboardRepository {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  /** Single-pass summary across active/ended classes, student activity, submission totals, and class health. */
  async findClassesAndSummary(
    lecturerId: string,
    activeSince: Date,
    now: Date,
  ): Promise<LecturerClassesAndSummaryResult> {
    const rows = (await this.em.query(
      `WITH lecturer_classes AS (
         SELECT
           c.id,
           c.class_code AS "classCode",
           c.name,
           c.is_active AS "isActive",
           sub.subject_code AS "subjectCode",
           sub.name AS "subjectName",
           sem.semester_code AS "semesterCode"
         FROM classes c
         LEFT JOIN subjects sub ON sub.id = c.subject_id
         LEFT JOIN semesters sem ON sem.id = c.semester_id
         WHERE c.lecturer_id = $1 AND c.deleted_at IS NULL
       ),
       active_classes AS (
         SELECT * FROM lecturer_classes WHERE "isActive" = true
       ),
       class_counts AS (
         SELECT
           COUNT(*) FILTER (WHERE "isActive" = true)::int AS "activeClassCount",
           COUNT(*) FILTER (WHERE "isActive" = false)::int AS "endedClassCount"
         FROM lecturer_classes
       ),
       student_activity AS (
         SELECT
           COUNT(DISTINCT cs.student_id)::int AS "totalStudents",
           COUNT(DISTINCT cs.student_id) FILTER (WHERE u.last_seen_at >= $2)::int AS "activeStudents7dCount"
         FROM active_classes ac
         INNER JOIN class_students cs ON cs.class_id = ac.id
         INNER JOIN users u ON u.id = cs.student_id AND u.deleted_at IS NULL
       ),
       class_enrollment AS (
         SELECT
           cs.class_id,
           COUNT(*)::int AS "studentCount",
           COUNT(*) FILTER (WHERE u.last_seen_at >= $2)::int AS "activeStudents7dCount"
         FROM class_students cs
         INNER JOIN active_classes ac ON ac.id = cs.class_id
         INNER JOIN users u ON u.id = cs.student_id AND u.deleted_at IS NULL
         GROUP BY cs.class_id
       ),
       raw_student_counts AS (
         SELECT cs.class_id, COUNT(*)::int AS cnt
         FROM class_students cs
         INNER JOIN active_classes ac ON ac.id = cs.class_id
         GROUP BY cs.class_id
       ),
       class_items AS (
         SELECT
           sec.class_id,
           COUNT(si.id)::int AS "itemCount",
           COUNT(ic.id)::int AS "completedCount"
         FROM active_classes ac
         INNER JOIN sections sec ON sec.class_id = ac.id AND sec.is_visible = true
         INNER JOIN section_items si ON si.section_id = sec.id AND si.deleted_at IS NULL AND si.is_visible = true
         LEFT JOIN item_completions ic ON ic.section_item_id = si.id
         GROUP BY sec.class_id
       ),
       open_class_assignments AS (
         SELECT DISTINCT sec.class_id, si.assignment_id
         FROM active_classes ac
         INNER JOIN sections sec ON sec.class_id = ac.id
         INNER JOIN section_items si ON si.section_id = sec.id AND si.deleted_at IS NULL AND si.assignment_id IS NOT NULL
         INNER JOIN assignments a ON a.id = si.assignment_id AND a.open_at <= $3
       ),
       assignment_stats AS (
         SELECT
           oca.class_id,
           COUNT(*)::int AS "openAssignmentsCount",
           COALESCE(SUM(COALESCE(sc.cnt, 0)), 0)::int AS "submittedTotal",
           COALESCE(SUM(COALESCE(rsc.cnt, 0)), 0)::int AS "expectedTotal",
           COALESCE(SUM(COALESCE(ps.cnt, 0)), 0)::int AS "pendingAssignments",
           AVG(ps.avg_score)::float8 AS "assignmentAvg"
         FROM open_class_assignments oca
         LEFT JOIN raw_student_counts rsc ON rsc.class_id = oca.class_id
         LEFT JOIN (
           SELECT assignment_id, COUNT(*)::int AS cnt
           FROM assignment_submissions
           GROUP BY assignment_id
         ) sc ON sc.assignment_id = oca.assignment_id
         LEFT JOIN (
           SELECT
             assignment_id,
             COUNT(*) FILTER (WHERE score IS NULL)::int AS cnt,
             AVG(score) FILTER (WHERE score IS NOT NULL)::float8 AS avg_score
           FROM assignment_submissions
           GROUP BY assignment_id
         ) ps ON ps.assignment_id = oca.assignment_id
         GROUP BY oca.class_id
       ),
       class_exams AS (
         SELECT
           es.class_id,
           COUNT(exs.id) FILTER (
             WHERE es.format = 'FILE'
               AND exs.status::text <> 'CANCELLED'
               AND exs.submitted_at IS NOT NULL
               AND exs.score IS NULL
           )::int AS "pendingExams",
           AVG(exs.score) FILTER (WHERE exs.score IS NOT NULL)::float8 AS "examAvg"
         FROM exam_schedules es
         INNER JOIN active_classes ac ON ac.id = es.class_id
         LEFT JOIN exam_sessions exs ON exs.exam_schedule_id = es.id
         GROUP BY es.class_id
       ),
       class_health AS (
         SELECT
           ac.id,
           ac."classCode",
           ac.name,
           COALESCE(ac."subjectCode", '') AS "subjectCode",
           COALESCE(ac."subjectName", '') AS "subjectName",
           COALESCE(ac."semesterCode", '') AS "semesterCode",
           COALESCE(ce."studentCount", 0)::int AS "studentCount",
           COALESCE(ce."activeStudents7dCount", 0)::int AS "activeStudents7dCount",
           COALESCE(ci."itemCount", 0)::int AS "itemCount",
           CASE
             WHEN COALESCE(ce."studentCount", 0) > 0 AND COALESCE(ci."itemCount", 0) > 0
               THEN LEAST(100, ROUND((COALESCE(ci."completedCount", 0)::numeric / (ce."studentCount" * ci."itemCount")) * 100)::int)
             ELSE 0
           END AS "completionRatePercent",
           CASE
             WHEN COALESCE(ce."studentCount", 0) > 0 AND COALESCE(ca."openAssignmentsCount", 0) > 0
               THEN LEAST(100, ROUND((COALESCE(ca."submittedTotal", 0)::numeric / (ce."studentCount" * ca."openAssignmentsCount")) * 100)::int)
             ELSE 0
           END AS "submissionRatePercent",
           CASE
             WHEN ca."assignmentAvg" IS NOT NULL AND cex."examAvg" IS NOT NULL
               THEN ROUND(((ca."assignmentAvg" + cex."examAvg") / 2.0)::numeric, 1)::float8
             WHEN ca."assignmentAvg" IS NOT NULL
               THEN ROUND(ca."assignmentAvg"::numeric, 1)::float8
             WHEN cex."examAvg" IS NOT NULL
               THEN ROUND(cex."examAvg"::numeric, 1)::float8
             ELSE NULL
           END AS "avgScore",
           (COALESCE(ca."pendingAssignments", 0) + COALESCE(cex."pendingExams", 0))::int AS "pendingGradingCount",
           COALESCE(ca."submittedTotal", 0)::int AS "submittedTotal",
           COALESCE(ca."expectedTotal", 0)::int AS "expectedTotal"
         FROM active_classes ac
         LEFT JOIN class_enrollment ce ON ce.class_id = ac.id
         LEFT JOIN class_items ci ON ci.class_id = ac.id
         LEFT JOIN assignment_stats ca ON ca.class_id = ac.id
         LEFT JOIN class_exams cex ON cex.class_id = ac.id
         ORDER BY "pendingGradingCount" DESC, ac."classCode" ASC
       ),
       submission_totals AS (
         SELECT
           COALESCE(SUM("submittedTotal"), 0)::int AS "submittedCount",
           COALESCE(SUM("expectedTotal"), 0)::int AS "expectedSubmissionCount"
         FROM class_health
       )
       SELECT
         cc."activeClassCount",
         cc."endedClassCount",
         sa."totalStudents",
         sa."activeStudents7dCount",
         st."submittedCount",
         st."expectedSubmissionCount",
         COALESCE(
           (SELECT json_agg(json_build_object(
             'id', ch.id,
             'classCode', ch."classCode",
             'name', ch.name,
             'subjectCode', ch."subjectCode",
             'subjectName', ch."subjectName",
             'semesterCode', ch."semesterCode",
             'studentCount', ch."studentCount",
             'activeStudents7dCount', ch."activeStudents7dCount",
             'itemCount', ch."itemCount",
             'completionRatePercent', ch."completionRatePercent",
             'submissionRatePercent', ch."submissionRatePercent",
             'avgScore', ch."avgScore",
             'pendingGradingCount', ch."pendingGradingCount"
           ) ORDER BY ch."pendingGradingCount" DESC, ch."classCode" ASC) FROM class_health ch),
           '[]'::json
         ) AS classes
       FROM class_counts cc
       CROSS JOIN student_activity sa
       CROSS JOIN submission_totals st`,
      [lecturerId, activeSince, now],
    )) as LecturerClassesAndSummaryResult[];

    return (
      rows[0] ?? {
        activeClassCount: 0,
        endedClassCount: 0,
        totalStudents: 0,
        activeStudents7dCount: 0,
        submittedCount: 0,
        expectedSubmissionCount: 0,
        classes: [],
      }
    );
  }

  /** Fetches candidate upcoming exams/assignments and recent low-submission assignments in one pass. */
  async findScheduleAndLowSubmissions(
    lecturerId: string,
    now: Date,
    recentClosedCutoff: Date,
    dueSoonCutoff: Date,
    upcomingTo: Date,
  ): Promise<LecturerScheduleCandidateRow[]> {
    return (await this.em.query(
      `WITH student_counts AS (
         SELECT cs.class_id, COUNT(*)::int AS cnt
         FROM class_students cs
         INNER JOIN classes c ON c.id = cs.class_id
         WHERE c.lecturer_id = $1 AND c.deleted_at IS NULL AND c.is_active = true
         GROUP BY cs.class_id
       ),
       exam_events AS (
         SELECT
           'exam:' || es.id AS id,
           'exam'::text AS kind,
           es.id AS "sourceId",
           c.id AS "classId",
           c.class_code AS "classCode",
           c.name AS "className",
           es.exam_name AS title,
           es.start_time AS "startAt",
           es.end_time AS "endAt",
           es.duration_minutes AS "durationMinutes",
           (es.start_time <= $2 AND es.end_time >= $2) AS "isLive",
           (SELECT COUNT(DISTINCT exs.student_id)::int
            FROM exam_sessions exs
            WHERE exs.exam_schedule_id = es.id AND exs.status::text <> 'CANCELLED') AS "submittedCount",
           COALESCE(stc.cnt, 0)::int AS "studentCount"
         FROM exam_schedules es
         INNER JOIN classes c ON c.id = es.class_id
         LEFT JOIN student_counts stc ON stc.class_id = c.id
         WHERE c.lecturer_id = $1
           AND c.deleted_at IS NULL
           AND c.is_active = true
           AND es.end_time >= $2
           AND es.start_time <= $5
       ),
       assignment_events AS (
         SELECT DISTINCT
           'assignment:' || a.id || ':' || c.id AS id,
           'assignment'::text AS kind,
           a.id AS "sourceId",
           c.id AS "classId",
           c.class_code AS "classCode",
           c.name AS "className",
           a.title,
           a.open_at AS "startAt",
           a.end_at AS "endAt",
           NULL::int AS "durationMinutes",
           (a.open_at <= $2 AND a.end_at >= $2) AS "isLive",
           (SELECT COUNT(*)::int FROM assignment_submissions asub WHERE asub.assignment_id = a.id) AS "submittedCount",
           COALESCE(stc.cnt, 0)::int AS "studentCount"
         FROM assignments a
         INNER JOIN section_items si ON si.assignment_id = a.id AND si.deleted_at IS NULL
         INNER JOIN sections sec ON sec.id = si.section_id
         INNER JOIN classes c ON c.id = sec.class_id
         LEFT JOIN student_counts stc ON stc.class_id = c.id
         WHERE c.lecturer_id = $1
           AND c.deleted_at IS NULL
           AND c.is_active = true
           AND (
             (a.end_at >= $2 AND a.end_at <= $5)
             OR (a.open_at <= $2 AND a.end_at >= $3 AND a.end_at <= $4)
           )
       )
       SELECT * FROM exam_events
       UNION ALL
       SELECT * FROM assignment_events`,
      [lecturerId, now, recentClosedCutoff, dueSoonCutoff, upcomingTo],
    )) as LecturerScheduleCandidateRow[];
  }

  /** Fetches ungraded counts and the oldest grading queue items in a single pass. */
  async findGradingOverview(
    lecturerId: string,
    overdueCutoff: Date,
    limit = 15,
  ): Promise<LecturerGradingOverviewResult> {
    const rows = (await this.em.query(
      `WITH lecturer_assignments AS (
         SELECT DISTINCT c.id AS class_id, c.class_code, c.name AS class_name, si.assignment_id
         FROM section_items si
         INNER JOIN sections sec ON sec.id = si.section_id
         INNER JOIN classes c ON c.id = sec.class_id
         WHERE c.lecturer_id = $1
           AND c.deleted_at IS NULL
           AND c.is_active = true
           AND si.deleted_at IS NULL
           AND si.assignment_id IS NOT NULL
       ),
       pending_items AS (
         SELECT
           'exam:' || exs.id AS "queueId",
           'exam'::text AS kind,
           es.id AS "sourceId",
           c.id AS "classId",
           c.class_code AS "classCode",
           c.name AS "className",
           es.exam_name AS title,
           s.user_id AS "studentId",
           u.full_name AS "studentName",
           s.student_code AS "studentCode",
           exs.submitted_at AS "submittedAt"
         FROM exam_sessions exs
         INNER JOIN exam_schedules es ON es.id = exs.exam_schedule_id
         INNER JOIN classes c ON c.id = es.class_id
         INNER JOIN students s ON s.user_id = exs.student_id
         INNER JOIN users u ON u.id = s.user_id
         WHERE c.lecturer_id = $1
           AND c.deleted_at IS NULL
           AND c.is_active = true
           AND es.format = 'FILE'
           AND exs.status::text <> 'CANCELLED'
           AND exs.submitted_at IS NOT NULL
           AND exs.score IS NULL
         UNION ALL
         SELECT
           'assignment:' || asub.id AS "queueId",
           'assignment'::text AS kind,
           a.id AS "sourceId",
           la.class_id AS "classId",
           la.class_code AS "classCode",
           la.class_name AS "className",
           a.title,
           s.user_id AS "studentId",
           u.full_name AS "studentName",
           s.student_code AS "studentCode",
           asub.submitted_at AS "submittedAt"
         FROM assignment_submissions asub
         INNER JOIN assignments a ON a.id = asub.assignment_id
         INNER JOIN lecturer_assignments la ON la.assignment_id = asub.assignment_id
         INNER JOIN students s ON s.user_id = asub.submitted_by
         INNER JOIN users u ON u.id = s.user_id
         WHERE asub.score IS NULL
       ),
       summary AS (
         SELECT
           COUNT(*) FILTER (WHERE kind = 'exam')::int AS "pendingExamsCount",
           COUNT(*) FILTER (WHERE kind = 'assignment')::int AS "pendingAssignmentsCount",
           COUNT(*) FILTER (WHERE "submittedAt" <= $2)::int AS "overdueGrading48hCount",
           MIN("submittedAt") AS "oldestPendingSubmittedAt"
         FROM pending_items
       ),
       top_queue AS (
         SELECT *
         FROM pending_items
         ORDER BY CASE WHEN kind = 'exam' THEN 0 ELSE 1 END ASC, "submittedAt" ASC
         LIMIT $3
       )
       SELECT
         summary."pendingExamsCount",
         summary."pendingAssignmentsCount",
         summary."overdueGrading48hCount",
         summary."oldestPendingSubmittedAt",
         COALESCE(
           (SELECT json_agg(t ORDER BY CASE WHEN t.kind = 'exam' THEN 0 ELSE 1 END ASC, t."submittedAt" ASC) FROM top_queue t),
           '[]'::json
         ) AS "gradingQueue"
       FROM summary`,
      [lecturerId, overdueCutoff, limit],
    )) as Array<
      Omit<LecturerGradingOverviewResult, 'gradingQueue'> & {
        gradingQueue: Array<
          Omit<LecturerGradingQueueItem, 'submittedAt'> & {
            submittedAt: Date | string;
          }
        >;
      }
    >;

    const row = rows[0];
    if (!row) {
      return {
        pendingExamsCount: 0,
        pendingAssignmentsCount: 0,
        overdueGrading48hCount: 0,
        oldestPendingSubmittedAt: null,
        gradingQueue: [],
      };
    }

    return {
      ...row,
      gradingQueue: row.gradingQueue.map((item) => ({
        ...item,
        submittedAt:
          item.submittedAt instanceof Date
            ? item.submittedAt
            : new Date(item.submittedAt),
      })),
    };
  }

  /** Fetches submission trend, score histogram buckets, and at-risk students in one query. */
  async findAnalyticsAndAtRisk(
    lecturerId: string,
    now: Date,
    inactiveCutoff: Date,
    trendFrom: Date,
    atRiskLimit = 8,
  ): Promise<LecturerAnalyticsAndAtRiskResult> {
    const rows = (await this.em.query(
      `WITH lecturer_assignments AS (
         SELECT DISTINCT c.id AS class_id, si.assignment_id
         FROM section_items si
         INNER JOIN sections sec ON sec.id = si.section_id
         INNER JOIN classes c ON c.id = sec.class_id
         WHERE c.lecturer_id = $1 AND c.deleted_at IS NULL AND si.deleted_at IS NULL AND si.assignment_id IS NOT NULL
       ),
       active_lecturer_assignments AS (
         SELECT DISTINCT c.id AS class_id, si.assignment_id
         FROM section_items si
         INNER JOIN sections sec ON sec.id = si.section_id
         INNER JOIN classes c ON c.id = sec.class_id
         WHERE c.lecturer_id = $1
           AND c.deleted_at IS NULL
           AND c.is_active = true
           AND si.deleted_at IS NULL
           AND si.assignment_id IS NOT NULL
       ),
       lecturer_events AS (
         SELECT asub.submitted_at, asub.graded_at
         FROM assignment_submissions asub
         INNER JOIN lecturer_assignments la ON la.assignment_id = asub.assignment_id
         UNION ALL
         SELECT exs.submitted_at, exs.graded_at
         FROM exam_sessions exs
         INNER JOIN exam_schedules es ON es.id = exs.exam_schedule_id
         INNER JOIN classes c ON c.id = es.class_id
         WHERE c.lecturer_id = $1 AND c.deleted_at IS NULL AND exs.status::text <> 'CANCELLED'
       ),
       submitted_daily AS (
         SELECT
           to_char(submitted_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS date,
           COUNT(*)::int AS cnt
         FROM lecturer_events
         WHERE submitted_at >= $4
         GROUP BY 1
       ),
       graded_daily AS (
         SELECT
           to_char(graded_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS date,
           COUNT(*)::int AS cnt
         FROM lecturer_events
         WHERE graded_at >= $4
         GROUP BY 1
       ),
       trend_dates AS (
         SELECT date FROM submitted_daily
         UNION
         SELECT date FROM graded_daily
       ),
       trend_rows AS (
         SELECT
           d.date,
           COALESCE(s.cnt, 0)::int AS submitted,
           COALESCE(g.cnt, 0)::int AS graded
         FROM trend_dates d
         LEFT JOIN submitted_daily s ON s.date = d.date
         LEFT JOIN graded_daily g ON g.date = d.date
         ORDER BY d.date ASC
       ),
       graded_scores AS (
         SELECT ala.class_id, asub.score::float8 AS score
         FROM assignment_submissions asub
         INNER JOIN active_lecturer_assignments ala ON ala.assignment_id = asub.assignment_id
         WHERE asub.score IS NOT NULL
         UNION ALL
         SELECT es.class_id, exs.score::float8 AS score
         FROM exam_sessions exs
         INNER JOIN exam_schedules es ON es.id = exs.exam_schedule_id
         INNER JOIN classes c ON c.id = es.class_id
         WHERE c.lecturer_id = $1 AND c.deleted_at IS NULL AND c.is_active = true AND exs.score IS NOT NULL
       ),
       score_buckets AS (
         SELECT
           class_id AS "classId",
           CASE
             WHEN score < 5 THEN '<5'
             WHEN score < 6.5 THEN '5-6.5'
             WHEN score < 8 THEN '6.5-8'
             WHEN score < 9 THEN '8-9'
             ELSE '9-10'
           END AS bucket,
           COUNT(*)::int AS count
         FROM graded_scores
         GROUP BY 1, 2
       ),
       class_past_assignments AS (
         SELECT ala.class_id, ala.assignment_id
         FROM active_lecturer_assignments ala
         INNER JOIN assignments a ON a.id = ala.assignment_id
         WHERE a.end_at < $2
       ),
       enrolled AS (
         SELECT
           cs.student_id,
           s.student_code AS "studentCode",
           u.full_name AS "fullName",
           u.last_seen_at AS "lastSeenAt",
           c.id AS "classId",
           c.class_code AS "classCode",
           c.name AS "className"
         FROM class_students cs
         INNER JOIN classes c ON c.id = cs.class_id
         INNER JOIN students s ON s.user_id = cs.student_id
         INNER JOIN users u ON u.id = s.user_id
         WHERE c.lecturer_id = $1 AND c.deleted_at IS NULL AND c.is_active = true
           AND u.deleted_at IS NULL AND u.is_active = true
       ),
       student_metrics AS (
         SELECT
           e.student_id AS "studentId",
           e."studentCode",
           e."fullName",
           e."classId",
           e."classCode",
           e."className",
           e."lastSeenAt",
           (
             SELECT COUNT(*)::int
             FROM class_past_assignments cpa
             WHERE cpa.class_id = e."classId"
               AND NOT EXISTS (
                 SELECT 1 FROM assignment_submissions asub
                 WHERE asub.assignment_id = cpa.assignment_id AND asub.submitted_by = e.student_id
               )
           ) AS "missedAssignmentsCount",
           (
             SELECT ROUND(AVG(score)::numeric, 1)::float8
             FROM (
               SELECT asub.score::float8 AS score
               FROM assignment_submissions asub
               INNER JOIN active_lecturer_assignments ala ON ala.assignment_id = asub.assignment_id
               WHERE ala.class_id = e."classId" AND asub.submitted_by = e.student_id AND asub.score IS NOT NULL
               UNION ALL
               SELECT exs.score::float8 AS score
               FROM exam_sessions exs
               INNER JOIN exam_schedules es ON es.id = exs.exam_schedule_id
               WHERE es.class_id = e."classId" AND exs.student_id = e.student_id AND exs.score IS NOT NULL
             ) scores
           ) AS "avgScore",
           CASE
             WHEN e."lastSeenAt" IS NULL THEN NULL
             ELSE FLOOR(EXTRACT(EPOCH FROM ($2 - e."lastSeenAt")) / 86400)::int
           END AS "daysInactive"
         FROM enrolled e
       ),
       flagged_students AS (
         SELECT *
         FROM student_metrics
         WHERE "missedAssignmentsCount" >= 2
            OR ("avgScore" IS NOT NULL AND "avgScore" < 5.0)
            OR ("lastSeenAt" IS NOT NULL AND "lastSeenAt" < $3)
         ORDER BY "missedAssignmentsCount" DESC, "avgScore" ASC NULLS LAST, "daysInactive" DESC NULLS LAST
         LIMIT $5
       )
       SELECT
         COALESCE((SELECT json_agg(tr ORDER BY tr.date ASC) FROM trend_rows tr), '[]'::json) AS trend,
         COALESCE((SELECT json_agg(sb) FROM score_buckets sb), '[]'::json) AS "scoreBuckets",
         COALESCE((SELECT json_agg(fs ORDER BY fs."missedAssignmentsCount" DESC, fs."avgScore" ASC NULLS LAST, fs."daysInactive" DESC NULLS LAST) FROM flagged_students fs), '[]'::json) AS "atRiskStudents"`,
      [lecturerId, now, inactiveCutoff, trendFrom, atRiskLimit],
    )) as Array<{
      trend: LecturerSubmissionTrendPoint[];
      scoreBuckets: LecturerScoreBucketRow[];
      atRiskStudents: Array<
        Omit<LecturerAtRiskStudentItem, 'lastSeenAt'> & {
          lastSeenAt: Date | string | null;
        }
      >;
    }>;

    const row = rows[0];
    if (!row) {
      return { trend: [], scoreBuckets: [], atRiskStudents: [] };
    }

    return {
      trend: row.trend,
      scoreBuckets: row.scoreBuckets,
      atRiskStudents: row.atRiskStudents.map((s) => ({
        ...s,
        lastSeenAt:
          s.lastSeenAt === null
            ? null
            : s.lastSeenAt instanceof Date
              ? s.lastSeenAt
              : new Date(s.lastSeenAt),
      })),
    };
  }
}
