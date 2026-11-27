import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionKnowledgeComponent } from '../entities/question-knowledge-component.entity.js';
import { QuizInstanceAnswer } from '../entities/quiz-instance-answer.entity.js';
import { QuestionReviewStatus } from '../enums/question-review-status.enum.js';
import { REVIEW_RULES } from '../utils/mastery-tracking.js';
import { EnasGatewayClient, type EnasGroup, type EnasHistoryStep } from './enas-gateway.client.js';

/** The model reads at most 100 steps; one is taken by the candidate itself. */
export const HISTORY_MAX = 99;
/** Questions per KC that are scored; picked evenly across the KC so the mean is not skewed. */
export const SAMPLE_PER_KC = 30;
/** Mastery is shown on pages the student opens, so a dead gateway must not make them wait long. */
const TIMEOUT_MS = 4_000;
/** After a failure the gateway is not called again for this long. */
const COOLDOWN_MS = 30_000;

export interface EnasKcMastery {
  /** 0..1 */
  mean: number;
  /** Number of questions that had a prediction. */
  n: number;
}

export interface EnasKcResult {
  byKc: Map<string, EnasKcMastery>;
  /** Position of this prediction in the gateway log (/monitor), null when the gateway did not say. */
  logSeq: number | null;
  lagMode: string | null;
}

export interface KcMasteryOptions {
  /** Leaves out the answers of one quiz, giving the state before that quiz. */
  excludeQuizId?: string;
  /** Label shown on the gateway monitor: mastery_view | quiz_after | quiz_before | recompute ... */
  purpose?: string;
}

/**
 * Mastery of knowledge components as predicted by the ENAS-KT model: the mean P(correct) over a sample of
 * the questions of the KC, given the student's answer history. Active only with QUESTION_SELECTOR=enas,
 * the same switch as question selection. Every method returns null when the model cannot be used, so the
 * callers fall back to the answer-count mastery.
 *
 * The mean itself is computed by the gateway (and logged there, see enas_gateway.py /monitor); this service
 * only picks the sample and the history. When an old gateway does not return it, the mean is computed here.
 */
@Injectable()
export class EnasMasteryService {
  private readonly logger = new Logger(EnasMasteryService.name);
  private downUntil = 0;

  constructor(
    @InjectRepository(QuestionKnowledgeComponent)
    private readonly links: Repository<QuestionKnowledgeComponent>,
    @InjectRepository(QuizInstanceAnswer)
    private readonly answers: Repository<QuizInstanceAnswer>,
    private readonly gateway: EnasGatewayClient,
  ) {}

  get enabled(): boolean {
    return process.env.QUESTION_SELECTOR === 'enas';
  }

  /**
   * The student's last answers on questions mapped to XES, oldest first.
   * `excludeQuizId` leaves out the answers of one quiz, giving the state before that quiz.
   */
  async history(studentId: string, excludeQuizId?: string): Promise<EnasHistoryStep[]> {
    const qb = this.answers
      .createQueryBuilder('a')
      .innerJoin('a.question', 'q')
      .select('q.xesQuestionId', 'xesQuestionId')
      .addSelect('a.isCorrect', 'isCorrect')
      .addSelect('a.answeredAt', 'answeredAt')
      .where('a.studentId = :studentId', { studentId })
      .andWhere('q.xesQuestionId IS NOT NULL');
    if (excludeQuizId) {
      qb.innerJoin('a.quizInstanceQuestion', 'qq').andWhere('qq.quizInstanceId <> :excludeQuizId', {
        excludeQuizId,
      });
    }
    const rows = await qb
      .orderBy('a.answeredAt', 'DESC')
      .limit(HISTORY_MAX)
      .getRawMany<{ xesQuestionId: number; isCorrect: boolean; answeredAt: Date }>();
    return rows.reverse().map((r) => ({
      qid: r.xesQuestionId,
      correct: r.isCorrect,
      timestamp: new Date(r.answeredAt).getTime(),
    }));
  }

  /**
   * Predicted mastery (0..1) per KC. A KC with no question mapped to XES is missing from the map.
   * Returns null when the model is off or unreachable.
   */
  async kcMastery(
    studentId: string,
    kcIds: string[],
    options: KcMasteryOptions = {},
  ): Promise<Map<string, number> | null> {
    const detailed = await this.kcMasteryDetailed(studentId, kcIds, options);
    if (!detailed) return null;
    return new Map([...detailed.byKc].map(([kcId, v]) => [kcId, v.mean]));
  }

  /** Like kcMastery, with the number of questions behind each value and the gateway log position. */
  async kcMasteryDetailed(
    studentId: string,
    kcIds: string[],
    options: KcMasteryOptions = {},
  ): Promise<EnasKcResult | null> {
    if (!this.enabled || kcIds.length === 0 || Date.now() < this.downUntil) return null;
    try {
      const sampleByKc = await this.sampleQuestions(kcIds);
      const groups: EnasGroup[] = [...sampleByKc].map(([kcId, s]) => ({ kcId, name: s.name, qids: s.qids }));
      if (groups.length === 0) return { byKc: new Map(), logSeq: null, lagMode: null };

      const res = await this.gateway.predictGrouped(
        await this.history(studentId, options.excludeQuizId),
        groups,
        {
          purpose: options.purpose ?? 'mastery_view',
          student: studentId,
          meta: {
            sample_per_kc: SAMPLE_PER_KC,
            history_max: HISTORY_MAX,
            level_thresholds: REVIEW_RULES.thresholds,
            review_days: REVIEW_RULES.days,
            exclude_quiz: options.excludeQuizId ?? null,
          },
        },
        TIMEOUT_MS,
      );

      const byKc = new Map<string, EnasKcMastery>();
      for (const g of groups) {
        const fromGateway = res.kc?.get(g.kcId);
        if (fromGateway) {
          byKc.set(g.kcId, fromGateway);
          continue;
        }
        if (res.kc) continue; // the gateway answered and had no prediction for this KC
        const known = g.qids.flatMap((x) => (res.p.has(x) ? [res.p.get(x)!] : []));
        if (known.length > 0) {
          byKc.set(g.kcId, { mean: known.reduce((s, v) => s + v, 0) / known.length, n: known.length });
        }
      }
      return { byKc, logSeq: res.logSeq, lagMode: res.lagMode };
    } catch (err) {
      this.downUntil = Date.now() + COOLDOWN_MS;
      this.logger.warn(`ENAS mastery unavailable: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /** XES question ids per KC (approved, active questions only), thinned to SAMPLE_PER_KC. */
  private async sampleQuestions(
    kcIds: string[],
  ): Promise<Map<string, { name: string; qids: number[] }>> {
    const rows = await this.links
      .createQueryBuilder('l')
      .innerJoin('l.question', 'q')
      .innerJoin('l.knowledgeComponent', 'kc')
      .select('l.kcId', 'kcId')
      .addSelect('kc.name', 'kcName')
      .addSelect('q.xesQuestionId', 'xesQuestionId')
      .where('l.kcId IN (:...kcIds)', { kcIds })
      .andWhere('q.xesQuestionId IS NOT NULL')
      .andWhere('q.reviewStatus = :status', { status: QuestionReviewStatus.APPROVED })
      .andWhere('q.isActive = true')
      .getRawMany<{ kcId: string; kcName: string; xesQuestionId: number }>();

    const byKc = new Map<string, { name: string; ids: Set<number> }>();
    for (const r of rows) {
      const entry = byKc.get(r.kcId) ?? { name: r.kcName, ids: new Set<number>() };
      entry.ids.add(r.xesQuestionId);
      byKc.set(r.kcId, entry);
    }
    return new Map(
      [...byKc].map(([kcId, e]) => [
        kcId,
        { name: e.name, qids: thin([...e.ids].sort((a, b) => a - b), SAMPLE_PER_KC) },
      ]),
    );
  }
}

/** At most `max` items spread evenly over the sorted list. */
const thin = (sorted: number[], max: number): number[] => {
  if (sorted.length <= max) return sorted;
  return Array.from({ length: max }, (_, i) => sorted[Math.round((i * (sorted.length - 1)) / (max - 1))]);
};
