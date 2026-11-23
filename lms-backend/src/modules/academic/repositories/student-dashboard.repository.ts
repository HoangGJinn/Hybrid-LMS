import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import type { StudentStudyActivityPoint } from '../types/student-dashboard-overview.type.js';

export interface StudentCourseRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly subjectId: string;
  readonly subjectCode: string;
  readonly subjectName: string;
  readonly semesterCode: string;
  readonly semesterName: string;
  readonly lecturerName: string | null;
  readonly totalItemsCount: number;
  readonly completedItemsCount: number;
}

export interface StudentAssignmentRow {
  readonly id: string;
  readonly itemId: string;
  readonly classId: string;
  readonly classCode: string;
  readonly className: string;
  readonly title: string;
  readonly openAt: Date | string;
  readonly endAt: Date | string;
  readonly submissionType: 'FILE' | 'TEXT' | 'BOTH' | null;
  readonly submissionId: string | null;
  readonly submittedAt: Date | string | null;
  readonly score: number | null;
  readonly comment: string | null;
  readonly gradedAt: Date | string | null;
}

export interface StudentExamRow {
  readonly id: string;
  readonly classId: string;
  readonly classCode: string;
  readonly className: string;
  readonly title: string;
  readonly startTime: Date | string;
  readonly endTime: Date | string;
  readonly durationMinutes: number;
  readonly maxAttempts: number | null;
  readonly showResults: boolean;
  readonly completedAttemptsCount: number;
  readonly hasInProgressSession: boolean;
  readonly bestScore: number | null;
  readonly comment: string | null;
  readonly gradedAt: Date | string | null;
}

export interface StudentMasteryTopicRow {
  readonly id: string;
  readonly kcId: string;
  readonly kcName: string;
  readonly pMastery: number;
  readonly attemptsCount: number;
  readonly lastUpdated: Date | string;
}

export interface StudentDashboardRawData {
  readonly courses: StudentCourseRow[];
  readonly assignments: StudentAssignmentRow[];
  readonly exams: StudentExamRow[];
  readonly studyActivity: StudentStudyActivityPoint[];
  readonly masteryTopics: StudentMasteryTopicRow[];
}

@Injectable()
export class StudentDashboardRepository {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  /** Fetches all enrolled courses, assignments, exams, study activity, and KC mastery in a single PostgreSQL round-trip. */
  async findDashboardData(
    studentId: string,
    trendFrom: Date,
  ): Promise<StudentDashboardRawData> {
    const rows = (await this.em.query(
      `WITH enrolled_classes AS (
         SELECT
           c.id,
           c.class_code AS code,
           c.name,
           sub.id AS "subjectId",
           sub.subject_code AS "subjectCode",
           sub.name AS "subjectName",
           sem.semester_code AS "semesterCode",
           sem.name AS "semesterName",
           sem.start_date AS "semesterStartDate",
           lu.full_name AS "lecturerName"
         FROM class_students cs
         INNER JOIN classes c ON c.id = cs.class_id AND c.deleted_at IS NULL AND c.is_active = true
         INNER JOIN subjects sub ON sub.id = c.subject_id
         INNER JOIN semesters sem ON sem.id = c.semester_id
         LEFT JOIN users lu ON lu.id = c.lecturer_id AND lu.deleted_at IS NULL
         WHERE cs.student_id = $1
       ),
       all_class_items AS (
         SELECT
           ec.id AS class_id,
           ec.code AS class_code,
           ec.name AS class_name,
           sec.is_visible AS sec_visible,
           si.id AS item_id,
           si.assignment_id,
           si.exam_id,
           si.order_index,
           si.is_visible AS item_visible,
           si.deleted_at AS item_deleted_at
         FROM enrolled_classes ec
         INNER JOIN sections sec ON sec.class_id = ec.id
         INNER JOIN section_items si ON si.section_id = sec.id
       ),
       visible_items AS (
         SELECT *
         FROM all_class_items
         WHERE sec_visible = true
           AND item_deleted_at IS NULL
           AND item_visible = true
       ),
       student_completions AS (
         SELECT ic.section_item_id, ic.completed_at
         FROM item_completions ic
         WHERE ic.student_id = $1
       ),
       student_submissions AS (
         SELECT asub.id, asub.assignment_id, asub.submitted_at, asub.score, asub.comment, asub.graded_at
         FROM assignment_submissions asub
         WHERE asub.submitted_by = $1
       ),
       student_exam_sessions AS (
         SELECT
           exs.exam_schedule_id,
           exs.status::text AS status,
           exs.score,
           exs.comment,
           exs.submitted_at,
           exs.ended_at,
           exs.graded_at
         FROM exam_sessions exs
         WHERE exs.student_id = $1
       ),
       course_item_counts AS (
         SELECT
           vi.class_id,
           COUNT(DISTINCT vi.item_id)::int AS "totalItemsCount",
           COUNT(DISTINCT vi.item_id) FILTER (
             WHERE EXISTS (
               SELECT 1 FROM student_completions sc WHERE sc.section_item_id = vi.item_id
             )
             OR (
               vi.assignment_id IS NOT NULL AND EXISTS (
                 SELECT 1 FROM student_submissions ss WHERE ss.assignment_id = vi.assignment_id
               )
             )
             OR (
               vi.exam_id IS NOT NULL AND EXISTS (
                 SELECT 1 FROM student_exam_sessions ses
                 WHERE ses.exam_schedule_id = vi.exam_id AND ses.status = 'COMPLETED'
               )
             )
           )::int AS "completedItemsCount"
         FROM visible_items vi
         GROUP BY vi.class_id
       ),
       courses_rows AS (
         SELECT
           ec.id,
           ec.code,
           ec.name,
           ec."subjectId",
           ec."subjectCode",
           ec."subjectName",
           ec."semesterCode",
           ec."semesterName",
           ec."lecturerName",
           COALESCE(cic."totalItemsCount", 0)::int AS "totalItemsCount",
           COALESCE(cic."completedItemsCount", 0)::int AS "completedItemsCount",
           ec."semesterStartDate"
         FROM enrolled_classes ec
         LEFT JOIN course_item_counts cic ON cic.class_id = ec.id
       ),
       assignments_rows AS (
         SELECT DISTINCT ON (vi.class_id, a.id)
           a.id,
           vi.item_id AS "itemId",
           vi.class_id AS "classId",
           vi.class_code AS "classCode",
           vi.class_name AS "className",
           a.title,
           a.open_at AS "openAt",
           a.end_at AS "endAt",
           a.submission_type AS "submissionType",
           ss.id AS "submissionId",
           ss.submitted_at AS "submittedAt",
           ss.score::float8 AS score,
           ss.comment,
           ss.graded_at AS "gradedAt"
         FROM visible_items vi
         INNER JOIN assignments a ON a.id = vi.assignment_id
         LEFT JOIN student_submissions ss ON ss.assignment_id = a.id
         WHERE vi.assignment_id IS NOT NULL
         ORDER BY vi.class_id, a.id, vi.order_index ASC
       ),
       hidden_exam_ids AS (
         SELECT DISTINCT aci.exam_id
         FROM all_class_items aci
         WHERE aci.exam_id IS NOT NULL
           AND (aci.item_deleted_at IS NOT NULL OR aci.item_visible = false OR aci.sec_visible = false)
       ),
       exam_session_stats AS (
         SELECT
           ses.exam_schedule_id,
           COUNT(*) FILTER (WHERE ses.status = 'COMPLETED')::int AS "completedAttemptsCount",
           BOOL_OR(ses.status = 'IN_PROGRESS') AS "hasInProgressSession"
         FROM student_exam_sessions ses
         GROUP BY ses.exam_schedule_id
       ),
       exam_best_session AS (
         SELECT DISTINCT ON (ses.exam_schedule_id)
           ses.exam_schedule_id,
           ses.score::float8 AS "bestScore",
           ses.comment,
           COALESCE(ses.graded_at, ses.submitted_at, ses.ended_at) AS "gradedAt"
         FROM student_exam_sessions ses
         WHERE ses.status = 'COMPLETED' AND ses.score IS NOT NULL
         ORDER BY ses.exam_schedule_id, ses.score DESC, ses.ended_at DESC NULLS LAST
       ),
       exams_rows AS (
         SELECT
           es.id,
           ec.id AS "classId",
           ec.code AS "classCode",
           ec.name AS "className",
           es.exam_name AS title,
           es.start_time AS "startTime",
           es.end_time AS "endTime",
           es.duration_minutes AS "durationMinutes",
           es.max_attempts AS "maxAttempts",
           es.show_results AS "showResults",
           COALESCE(ess."completedAttemptsCount", 0)::int AS "completedAttemptsCount",
           COALESCE(ess."hasInProgressSession", false) AS "hasInProgressSession",
           ebs."bestScore",
           ebs.comment,
           ebs."gradedAt"
         FROM enrolled_classes ec
         INNER JOIN exam_schedules es ON es.class_id = ec.id
         LEFT JOIN exam_session_stats ess ON ess.exam_schedule_id = es.id
         LEFT JOIN exam_best_session ebs ON ebs.exam_schedule_id = es.id
         WHERE NOT EXISTS (
           SELECT 1 FROM hidden_exam_ids he WHERE he.exam_id = es.id
         )
       ),
       completed_daily AS (
         SELECT
           to_char(sc.completed_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS date,
           COUNT(*)::int AS cnt
         FROM student_completions sc
         WHERE sc.completed_at >= $2
         GROUP BY 1
       ),
       submission_events AS (
         SELECT ss.submitted_at AS event_at
         FROM student_submissions ss
         WHERE ss.submitted_at >= $2
         UNION ALL
         SELECT COALESCE(ses.submitted_at, ses.ended_at) AS event_at
         FROM student_exam_sessions ses
         WHERE ses.status = 'COMPLETED'
           AND COALESCE(ses.submitted_at, ses.ended_at) >= $2
       ),
       submission_daily AS (
         SELECT
           to_char(event_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS date,
           COUNT(*)::int AS cnt
         FROM submission_events
         GROUP BY 1
       ),
       activity_dates AS (
         SELECT date FROM completed_daily
         UNION
         SELECT date FROM submission_daily
       ),
       activity_rows AS (
         SELECT
           d.date,
           COALESCE(c.cnt, 0)::int AS "completedItems",
           COALESCE(s.cnt, 0)::int AS submissions
         FROM activity_dates d
         LEFT JOIN completed_daily c ON c.date = d.date
         LEFT JOIN submission_daily s ON s.date = d.date
       ),
       mastery_rows AS (
         SELECT
           m.id,
           m.kc_id AS "kcId",
           kc.name AS "kcName",
           m.p_mastery::float8 AS "pMastery",
           m.attempts_count::int AS "attemptsCount",
           m.last_updated AS "lastUpdated"
         FROM student_kc_mastery m
         INNER JOIN knowledge_components kc ON kc.id = m.kc_id
         WHERE m.student_id = $1
       )
       SELECT
         COALESCE(
           (SELECT json_agg(json_build_object(
             'id', cr.id,
             'code', cr.code,
             'name', cr.name,
             'subjectId', cr."subjectId",
             'subjectCode', cr."subjectCode",
             'subjectName', cr."subjectName",
             'semesterCode', cr."semesterCode",
             'semesterName', cr."semesterName",
             'lecturerName', cr."lecturerName",
             'totalItemsCount', cr."totalItemsCount",
             'completedItemsCount', cr."completedItemsCount"
           ) ORDER BY cr."semesterStartDate" DESC, cr.code ASC) FROM courses_rows cr),
           '[]'::json
         ) AS courses,
         COALESCE(
           (SELECT json_agg(ar) FROM assignments_rows ar),
           '[]'::json
         ) AS assignments,
         COALESCE(
           (SELECT json_agg(er ORDER BY er."startTime" ASC) FROM exams_rows er),
           '[]'::json
         ) AS exams,
         COALESCE(
           (SELECT json_agg(act ORDER BY act.date ASC) FROM activity_rows act),
           '[]'::json
         ) AS "studyActivity",
         COALESCE(
           (SELECT json_agg(mr ORDER BY mr."pMastery" ASC, mr."attemptsCount" DESC) FROM mastery_rows mr),
           '[]'::json
         ) AS "masteryTopics"`,
      [studentId, trendFrom],
    )) as StudentDashboardRawData[];

    return (
      rows[0] ?? {
        courses: [],
        assignments: [],
        exams: [],
        studyActivity: [],
        masteryTopics: [],
      }
    );
  }
}
