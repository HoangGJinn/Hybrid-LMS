import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { KnowledgeComponent } from '../../document/entities/knowledge-component.entity.js';
import { StudentCompetencyHistory } from '../../mastery/entities/student-competency-history.entity.js';
import { StudentKcMasteryHistory } from '../../mastery/entities/student-kc-mastery-history.entity.js';
import { StudentKcMastery } from '../../mastery/entities/student-kc-mastery.entity.js';
import { StudentKcReviewSchedule } from '../../mastery/entities/student-kc-review-schedule.entity.js';
import { StudentSubjectCompetency } from '../../mastery/entities/student-subject-competency.entity.js';
import { QuizInstanceAnswer } from '../entities/quiz-instance-answer.entity.js';
import type { QuizInstance } from '../entities/quiz-instance.entity.js';
import type { KcMasteryRowView, SubjectCompetencyRowView } from '../types/mastery-view.type.js';
import { computeMasteryByKc } from '../utils/mastery.js';
import {
  abilityScore,
  addDays,
  nextReviewState,
  roundMastery,
} from '../utils/mastery-tracking.js';
import { EnasMasteryService } from './enas-mastery.service.js';

const HISTORY_ROWS = 2000;
/** A change smaller than this counts as "not worse" for the ease factor (numeric(4,3) rounding noise). */
const EPS = 0.0005;

interface Measured {
  p: number;
  n: number;
  source: 'enas' | 'history';
  logSeq: number | null;
  lagMode: string | null;
}

/**
 * Keeps the four mastery tables up to date:
 *   student_kc_mastery            current ENAS mastery of every KC the student answered
 *   student_kc_mastery_history    mastery of each KC before/after every quiz (audit trail, links to the gateway log)
 *   student_kc_review_schedule    next review of each KC (rules: REVIEW_RULES in utils/mastery-tracking.ts)
 *   student_subject_competency    ability per subject = 100 x mean KC mastery, plus student_competency_history per quiz
 * Writing never breaks the student's flow: recordQuiz logs its failure and returns.
 */
@Injectable()
export class MasteryTrackingService {
  private readonly logger = new Logger(MasteryTrackingService.name);

  constructor(
    @InjectRepository(StudentKcMastery)
    private readonly masteries: Repository<StudentKcMastery>,
    @InjectRepository(StudentKcMasteryHistory)
    private readonly kcHistory: Repository<StudentKcMasteryHistory>,
    @InjectRepository(StudentSubjectCompetency)
    private readonly competencies: Repository<StudentSubjectCompetency>,
    @InjectRepository(KnowledgeComponent)
    private readonly kcs: Repository<KnowledgeComponent>,
    @InjectRepository(QuizInstanceAnswer)
    private readonly answers: Repository<QuizInstanceAnswer>,
    private readonly enas: EnasMasteryService,
    private readonly dataSource: DataSource,
  ) {}

  // ---------------------------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------------------------

  /** Called once when a quiz is submitted. Never throws. */
  async recordQuiz(quiz: QuizInstance): Promise<void> {
    try {
      await this.doRecordQuiz(quiz);
    } catch (err) {
      this.logger.error(
        `Could not record mastery of quiz ${quiz.id}: ${err instanceof Error ? err.stack : String(err)}`,
      );
    }
  }

  private async doRecordQuiz(quiz: QuizInstance): Promise<void> {
    const studentId = quiz.studentId;
    const touched = await this.answers
      .createQueryBuilder('a')
      .innerJoin('a.quizInstanceQuestion', 'qq')
      .select('DISTINCT a.kcId', 'kcId')
      .where('qq.quizInstanceId = :quizId', { quizId: quiz.id })
      .andWhere('a.studentId = :studentId', { studentId })
      .andWhere('a.kcId IS NOT NULL')
      .getRawMany<{ kcId: string }>();
    const kcIds = touched.map((t) => t.kcId);
    if (kcIds.length === 0) return;

    const existing = new Map(
      (await this.masteries.find({ where: { studentId, kcId: In(kcIds) } })).map((m) => [m.kcId, m]),
    );

    // KCs the student already answered before this quiz but that were never stored (data from before this
    // feature): their "before" is what the model said without this quiz's answers.
    const unseen = kcIds.filter((k) => !existing.has(k));
    const seeds = new Map<string, Measured>();
    if (unseen.length > 0) {
      const prior = await this.answers
        .createQueryBuilder('a')
        .innerJoin('a.quizInstanceQuestion', 'qq')
        .select('DISTINCT a.kcId', 'kcId')
        .where('a.studentId = :studentId', { studentId })
        .andWhere('a.kcId IN (:...unseen)', { unseen })
        .andWhere('qq.quizInstanceId <> :quizId', { quizId: quiz.id })
        .getRawMany<{ kcId: string }>();
      const had = prior.map((r) => r.kcId);
      if (had.length > 0) {
        const before = await this.enas.kcMasteryDetailed(studentId, had, {
          excludeQuizId: quiz.id,
          purpose: 'quiz_before',
        });
        for (const [kcId, v] of before?.byKc ?? []) {
          seeds.set(kcId, { p: v.mean, n: v.n, source: 'enas', logSeq: before!.logSeq, lagMode: before!.lagMode });
        }
      }
    }

    const after = await this.measure(studentId, kcIds, 'quiz_after');
    const stats = await this.answerStats(studentId, kcIds);
    const kcRows = await this.kcs.find({ where: { id: In(kcIds) } });
    const subjectOf = new Map(kcRows.map((k) => [k.id, k.subjectId]));
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      for (const kcId of kcIds) {
        const m = after.get(kcId);
        if (!m) continue; // the KC has no question the model knows and no usable history
        const prev = existing.get(kcId);
        const before = prev ? Number(prev.pMastery) : (seeds.get(kcId)?.p ?? null);
        await this.saveKc(manager, { studentId, kcId, measured: m, stats: stats.get(kcId), now, prev });
        await manager.save(
          manager.create(StudentKcMasteryHistory, {
            studentId,
            kcId,
            quizInstanceId: quiz.id,
            pBefore: before === null ? null : roundMastery(before),
            pAfter: roundMastery(m.p),
            sampleSize: m.n,
            source: m.source,
            enasLogSeq: m.logSeq,
          }),
        );
      }

      for (const subjectId of new Set(kcIds.flatMap((k) => (subjectOf.has(k) ? [subjectOf.get(k)!] : [])))) {
        const { row, before, after: ability } = await this.refreshSubject(manager, studentId, subjectId);
        row.quizzesTaken += 1;
        await manager.save(row);
        await manager.save(
          manager.create(StudentCompetencyHistory, {
            quizInstanceId: quiz.id,
            subjectCompetencyId: row.id,
            abilityScoreBefore: before,
            abilityScoreAfter: ability,
          }),
        );
      }
    });
  }

  /**
   * Recomputes the mastery of every KC the student ever answered (used to fill the tables for students who
   * answered before this feature existed). Does not touch the per-quiz histories or the quiz counters.
   */
  async recompute(studentId: string): Promise<void> {
    const rows = await this.answers
      .createQueryBuilder('a')
      .select('DISTINCT a.kcId', 'kcId')
      .where('a.studentId = :studentId', { studentId })
      .andWhere('a.kcId IS NOT NULL')
      .getRawMany<{ kcId: string }>();
    const kcIds = rows.map((r) => r.kcId);
    if (kcIds.length === 0) return;

    const measured = await this.measure(studentId, kcIds, 'recompute');
    const stats = await this.answerStats(studentId, kcIds);
    const existing = new Map(
      (await this.masteries.find({ where: { studentId, kcId: In(kcIds) } })).map((m) => [m.kcId, m]),
    );
    const subjectOf = new Map((await this.kcs.find({ where: { id: In(kcIds) } })).map((k) => [k.id, k.subjectId]));
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      for (const kcId of kcIds) {
        const m = measured.get(kcId);
        if (!m) continue;
        await this.saveKc(manager, { studentId, kcId, measured: m, stats: stats.get(kcId), now, prev: existing.get(kcId) });
      }
      for (const subjectId of new Set(kcIds.flatMap((k) => (subjectOf.has(k) ? [subjectOf.get(k)!] : [])))) {
        await this.refreshSubject(manager, studentId, subjectId);
      }
    });
  }

  /** Upserts the mastery row and the review schedule of one KC. */
  private async saveKc(
    manager: EntityManager,
    a: {
      studentId: string;
      kcId: string;
      measured: Measured;
      stats?: { attempts: number; correct: number };
      now: Date;
      prev?: StudentKcMastery;
    },
  ): Promise<void> {
    const { studentId, kcId, measured: m, stats, now, prev } = a;
    const row =
      prev ?? manager.create(StudentKcMastery, { studentId, kcId, pPrev: null, attemptsCount: 0, correctCount: 0 });
    const prevP = prev ? Number(prev.pMastery) : null;
    row.pPrev = prevP === null ? null : roundMastery(prevP);
    row.pMastery = roundMastery(m.p);
    row.sampleSize = m.n;
    row.attemptsCount = stats?.attempts ?? row.attemptsCount;
    row.correctCount = stats?.correct ?? row.correctCount;
    row.source = m.source;
    row.enasLogSeq = m.logSeq;
    row.lagMode = m.lagMode;
    row.lastUpdated = now;
    const saved = await manager.save(row);

    const schedule = await manager.findOne(StudentKcReviewSchedule, { where: { masteryId: saved.id } });
    const improved = prevP === null || m.p >= prevP - EPS;
    const next = nextReviewState(
      m.p,
      improved,
      schedule ? { intervalDays: schedule.intervalDays, easeFactor: Number(schedule.easeFactor) } : null,
    );
    await manager.save(
      schedule
        ? Object.assign(schedule, { ...next, nextReviewAt: addDays(now, next.intervalDays) })
        : manager.create(StudentKcReviewSchedule, {
            masteryId: saved.id,
            ...next,
            nextReviewAt: addDays(now, next.intervalDays),
          }),
    );
  }

  /** Recomputes the ability of the student in a subject from the stored KC masteries. */
  private async refreshSubject(
    manager: EntityManager,
    studentId: string,
    subjectId: string,
  ): Promise<{ row: StudentSubjectCompetency; before: number | null; after: number }> {
    const rows = await manager
      .createQueryBuilder(StudentKcMastery, 'm')
      .innerJoin('m.knowledgeComponent', 'kc')
      .where('m.studentId = :studentId', { studentId })
      .andWhere('kc.subjectId = :subjectId', { subjectId })
      .getMany();
    const after = abilityScore(rows.map((r) => Number(r.pMastery)));

    const found = await manager.findOne(StudentSubjectCompetency, { where: { studentId, subjectId } });
    const row = found ?? manager.create(StudentSubjectCompetency, { studentId, subjectId, quizzesTaken: 0 });
    const before = found ? Number(found.abilityScore) : null;
    row.abilityScore = after;
    return { row: await manager.save(row), before, after };
  }

  // ---------------------------------------------------------------------------------------------
  // Reads (Knowledge Mastery tab)
  // ---------------------------------------------------------------------------------------------

  /** The student's KC masteries with the next review. Fills the table on first use for existing students. */
  async listKc(studentId: string): Promise<KcMasteryRowView[]> {
    let rows = await this.loadKcRows(studentId);
    if (rows.length === 0 && (await this.hasAnswers(studentId))) {
      await this.recompute(studentId);
      rows = await this.loadKcRows(studentId);
    }
    return rows;
  }

  async listCompetency(studentId: string): Promise<SubjectCompetencyRowView[]> {
    const rows = await this.competencies.find({ where: { studentId }, relations: { subject: true } });
    return rows
      .map((r) => ({
        id: r.id,
        subjectId: r.subjectId,
        subjectName: r.subject.name,
        abilityScore: Number(r.abilityScore),
        quizzesTaken: r.quizzesTaken,
      }))
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }

  private async loadKcRows(studentId: string): Promise<KcMasteryRowView[]> {
    const rows = await this.masteries.find({ where: { studentId }, relations: { knowledgeComponent: true } });
    if (rows.length === 0) return [];
    const schedules = await this.dataSource.getRepository(StudentKcReviewSchedule).find({
      where: { masteryId: In(rows.map((r) => r.id)) },
    });
    const scheduleOf = new Map(schedules.map((s) => [s.masteryId, s]));
    return rows.map((r) => {
      const s = scheduleOf.get(r.id);
      return {
        id: r.id,
        kcId: r.kcId,
        kcName: r.knowledgeComponent.name,
        subjectId: r.knowledgeComponent.subjectId,
        pMastery: Number(r.pMastery),
        pPrev: r.pPrev === null ? null : Number(r.pPrev),
        sampleSize: r.sampleSize,
        attemptsCount: r.attemptsCount,
        correctCount: r.correctCount,
        source: r.source,
        enasLogSeq: r.enasLogSeq,
        lastUpdated: r.lastUpdated,
        nextReviewAt: s?.nextReviewAt ?? null,
        intervalDays: s?.intervalDays ?? null,
      };
    });
  }

  /** Stored before/after of the KCs of one quiz, keyed by KC. Empty for quizzes submitted before this feature. */
  async quizKcSnapshots(quizId: string): Promise<Map<string, StudentKcMasteryHistory>> {
    const rows = await this.kcHistory.find({ where: { quizInstanceId: quizId } });
    return new Map(rows.map((r) => [r.kcId, r]));
  }

  // ---------------------------------------------------------------------------------------------

  /** ENAS mastery of the KCs, with the answer-share fallback for those the model cannot give. */
  private async measure(
    studentId: string,
    kcIds: string[],
    purpose: string,
  ): Promise<Map<string, Measured>> {
    const out = new Map<string, Measured>();
    const model = await this.enas.kcMasteryDetailed(studentId, kcIds, { purpose });
    for (const [kcId, v] of model?.byKc ?? []) {
      out.set(kcId, { p: v.mean, n: v.n, source: 'enas', logSeq: model!.logSeq, lagMode: model!.lagMode });
    }

    const rest = kcIds.filter((k) => !out.has(k));
    if (rest.length > 0) {
      const rows = await this.answers.find({
        select: { kcId: true, isCorrect: true, answeredAt: true },
        where: { studentId, kcId: In(rest) },
        order: { answeredAt: 'DESC' },
        take: HISTORY_ROWS,
      });
      const byKc = computeMasteryByKc(
        rows.map((r) => ({ kcId: r.kcId, isCorrect: r.isCorrect, answeredAt: r.answeredAt })),
      );
      for (const [kcId, v] of byKc) {
        out.set(kcId, { p: v.mastery, n: v.attempted, source: 'history', logSeq: null, lagMode: null });
      }
    }
    return out;
  }

  private async answerStats(
    studentId: string,
    kcIds: string[],
  ): Promise<Map<string, { attempts: number; correct: number }>> {
    const rows = await this.answers
      .createQueryBuilder('a')
      .select('a.kcId', 'kcId')
      .addSelect('COUNT(*)', 'attempts')
      .addSelect('SUM(CASE WHEN a.isCorrect THEN 1 ELSE 0 END)', 'correct')
      .where('a.studentId = :studentId', { studentId })
      .andWhere('a.kcId IN (:...kcIds)', { kcIds })
      .groupBy('a.kcId')
      .getRawMany<{ kcId: string; attempts: string; correct: string }>();
    return new Map(rows.map((r) => [r.kcId, { attempts: Number(r.attempts), correct: Number(r.correct) }]));
  }

  private async hasAnswers(studentId: string): Promise<boolean> {
    return (await this.answers.count({ where: { studentId }, take: 1 })) > 0;
  }
}
