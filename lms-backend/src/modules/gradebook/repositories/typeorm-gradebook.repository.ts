import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In, IsNull } from 'typeorm';
import { GradebookRepository } from './gradebook.repository.js';
import type {
  GradeColumnDef,
  GradeColumnKind,
  GradeScoreRow,
  GradeStudent,
} from '../types/gradebook.types.js';

import { Class } from '../../academic/entities/class.entity.js';
import { Section } from '../../content/entities/section.entity.js';
import { SectionItem } from '../../content/entities/section-item.entity.js';
import { ClassStudent } from '../../academic/entities/class-student.entity.js';
import { Assignment } from '../../assignment/entities/assignment.entity.js';
import { AssignmentSubmission } from '../../assignment/entities/assignment-submission.entity.js';
import { ExamSchedule } from '../../exam/entities/exam-schedule.entity.js';
import { ExamSection } from '../../exam/entities/exam-section.entity.js';
import { ExamSession } from '../../exam/entities/exam-session.entity.js';

const FALLBACK_SECTION_ID = 'no-section';
const FALLBACK_SECTION_NAME = 'Khác';

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * ExamSchedule chưa có cột phân loại giữa kỳ / kiểm tra -> suy từ tên kỳ thi.
 * (exam_schedule_modes liên kết tới ExamMode, đó là chế độ thi chứ không phải loại bài.)
 */
const examKind = (exam: ExamSchedule): GradeColumnKind =>
  /giữa\s*kỳ|giua\s*ky|midterm/i.test(exam.examName) ? 'midterm' : 'quiz';

@Injectable()
export class TypeOrmGradebookRepository extends GradebookRepository {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {
    super();
  }

  async getClassCode(classId: string): Promise<string> {
    const classEntity = await this.em.findOne(Class, { where: { id: classId } });
    if (!classEntity) throw new NotFoundException('Class not found');
    return classEntity.classCode;
  }

  /**
   * Section của lớp và các mục (chưa xóa) nằm trong chúng, đã sắp theo orderIndex.
   * Assignment không có classId, nó thuộc lớp thông qua section_items -> sections.
   */
  private async loadSectionsAndItems(classId: string) {
    const sections = await this.em.find(Section, {
      where: { classId },
      order: { orderIndex: 'ASC' },
    });
    const sectionIds = sections.map((s) => s.id);
    const items =
      sectionIds.length > 0
        ? await this.em.find(SectionItem, {
            where: { sectionId: In(sectionIds), deletedAt: IsNull() },
            order: { orderIndex: 'ASC' },
          })
        : [];
    return { sections, items };
  }

  /**
   * Thứ tự cột: theo section; trong section là bài tập trước, kiểm tra sau
   * (khớp mẫu: S1 = BT1, KT1 · S2 = BT2, BT3, Giữa kỳ · S3 = BT4, BT5, KT2).
   */
  async listColumns(classId: string): Promise<GradeColumnDef[]> {
    const { sections, items } = await this.loadSectionsAndItems(classId);

    // Giữ thứ tự xuất hiện trong section_items (đã sort theo orderIndex).
    const assignmentIds = [
      ...new Set(
        items
          .map((i) => i.assignmentId)
          .filter((id): id is string => id !== null),
      ),
    ];

    const [assignments, exams] = await Promise.all([
      assignmentIds.length > 0
        ? this.em.find(Assignment, { where: { id: In(assignmentIds) } })
        : Promise.resolve([] as Assignment[]),
      this.em.find(ExamSchedule, {
        where: { classId },
        order: { startTime: 'ASC' },
      }),
    ]);

    const examIds = exams.map((e) => e.id);
    const examSections =
      examIds.length > 0
        ? await this.em.find(ExamSection, {
            where: { examScheduleId: In(examIds) },
          })
        : [];

    const known = new Set(sections.map((s) => s.id));

    const assignmentById = new Map(assignments.map((a) => [a.id, a]));
    const orderedAssignments = assignmentIds
      .map((id) => assignmentById.get(id))
      .filter((a): a is Assignment => a !== undefined);

    const assignmentSection = new Map<string, string>();
    const examSection = new Map<string, string>();
    for (const item of items) {
      if (item.assignmentId && !assignmentSection.has(item.assignmentId)) {
        assignmentSection.set(item.assignmentId, item.sectionId);
      }
      if (item.examId && !examSection.has(item.examId)) {
        examSection.set(item.examId, item.sectionId);
      }
    }
    // Bài kiểm tra có thể chỉ được gắn section qua exam_sections.
    for (const es of examSections) {
      if (known.has(es.sectionId) && !examSection.has(es.examScheduleId)) {
        examSection.set(es.examScheduleId, es.sectionId);
      }
    }

    const buckets = sections.map((s) => ({ id: s.id, name: s.title }));
    if (exams.some((e) => !examSection.has(e.id))) {
      buckets.push({ id: FALLBACK_SECTION_ID, name: FALLBACK_SECTION_NAME });
    }

    const examBelongsTo = (examId: string, bucketId: string) =>
      bucketId === FALLBACK_SECTION_ID
        ? !examSection.has(examId)
        : examSection.get(examId) === bucketId;

    const columns: GradeColumnDef[] = [];
    let order = 0;
    let assignmentNo = 0;
    let quizNo = 0;

    for (const bucket of buckets) {
      const base = { sectionId: bucket.id, sectionName: bucket.name };
      for (const a of orderedAssignments) {
        if (assignmentSection.get(a.id) !== bucket.id) continue;
        columns.push({
          ...base,
          id: a.id,
          kind: 'assignment',
          label: `BT${++assignmentNo}`,
          order: order++,
        });
      }
      for (const e of exams) {
        if (!examBelongsTo(e.id, bucket.id)) continue;
        const kind = examKind(e);
        columns.push({
          ...base,
          id: e.id,
          kind,
          label: kind === 'midterm' ? 'Giữa kỳ' : `KT${++quizNo}`,
          order: order++,
        });
      }
    }
    return columns;
  }

  async listStudents(classId: string): Promise<GradeStudent[]> {
    const enrollments = await this.em.find(ClassStudent, {
      where: { classId },
      relations: { student: { user: true } },
    });
    return enrollments.map((e) => ({
      id: e.student.userId,
      studentCode: e.student.studentCode,
      fullName: e.student.user.fullName,
    }));
  }

  async listScores(classId: string): Promise<GradeScoreRow[]> {
    const [{ items }, exams] = await Promise.all([
      this.loadSectionsAndItems(classId),
      this.em.find(ExamSchedule, { where: { classId }, select: { id: true } }),
    ]);
    const assignmentIds = [
      ...new Set(
        items
          .map((i) => i.assignmentId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const examIds = exams.map((e) => e.id);

    const [submissions, sessions] = await Promise.all([
      assignmentIds.length > 0
        ? this.em.find(AssignmentSubmission, {
            where: { assignmentId: In(assignmentIds) },
            select: { assignmentId: true, submittedBy: true, score: true },
          })
        : Promise.resolve([] as AssignmentSubmission[]),
      examIds.length > 0
        ? this.em.find(ExamSession, {
            where: { examScheduleId: In(examIds) },
            select: { examScheduleId: true, studentId: true, score: true },
          })
        : Promise.resolve([] as ExamSession[]),
    ]);

    const rows: GradeScoreRow[] = submissions.map((s) => ({
      studentId: s.submittedBy,
      columnId: s.assignmentId,
      score: toNumberOrNull(s.score),
    }));

    // Nhiều lượt thi -> lấy điểm cao nhất đã chấm (khớp ghi chú maxAttempts của ExamSchedule).
    const best = new Map<string, GradeScoreRow>();
    for (const s of sessions) {
      const score = toNumberOrNull(s.score);
      if (score === null) continue;
      const key = `${s.studentId}:${s.examScheduleId}`;
      const prev = best.get(key);
      if (!prev || (prev.score ?? -1) < score) {
        best.set(key, { studentId: s.studentId, columnId: s.examScheduleId, score });
      }
    }
    return [...rows, ...best.values()];
  }
}