import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionKnowledgeComponent } from '../entities/question-knowledge-component.entity.js';
import { QuizInstanceAnswer } from '../entities/quiz-instance-answer.entity.js';
import { QuestionReviewStatus } from '../enums/question-review-status.enum.js';
import { EnasGatewayClient, type EnasHistoryStep } from './enas-gateway.client.js';

/** The model reads at most 100 steps; one is taken by the candidate itself. */
const HISTORY_MAX = 99;
/** Questions per KC that are scored; picked evenly across the KC so the mean is not skewed. */
const SAMPLE_PER_KC = 30;
/** Mastery is shown on pages the student opens, so a dead gateway must not make them wait long. */
const TIMEOUT_MS = 4_000;
/** After a failure the gateway is not called again for this long. */
const COOLDOWN_MS = 30_000;

/**
 * Mastery of knowledge components as predicted by the ENAS-KT model: the mean P(correct) over a sample of
 * the questions of the KC, given the student's answer history. Active only with QUESTION_SELECTOR=enas,
 * the same switch as question selection. Every method returns null when the model cannot be used, so the
 * callers fall back to the answer-count mastery.
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
    options: { excludeQuizId?: string } = {},
  ): Promise<Map<string, number> | null> {
    if (!this.enabled || kcIds.length === 0 || Date.now() < this.downUntil) return null;
    try {
      const sampleByKc = await this.sampleQuestions(kcIds);
      const candidates = [...new Set([...sampleByKc.values()].flat())];
      if (candidates.length === 0) return new Map();

      const p = await this.gateway.predict(
        await this.history(studentId, options.excludeQuizId),
        candidates,
        TIMEOUT_MS,
      );

      const out = new Map<string, number>();
      for (const [kcId, xesIds] of sampleByKc) {
        const known = xesIds.flatMap((x) => (p.has(x) ? [p.get(x)!] : []));
        if (known.length > 0) out.set(kcId, known.reduce((s, v) => s + v, 0) / known.length);
      }
      return out;
    } catch (err) {
      this.downUntil = Date.now() + COOLDOWN_MS;
      this.logger.warn(`ENAS mastery unavailable: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /** XES question ids per KC (approved, active questions only), thinned to SAMPLE_PER_KC. */
  private async sampleQuestions(kcIds: string[]): Promise<Map<string, number[]>> {
    const rows = await this.links
      .createQueryBuilder('l')
      .innerJoin('l.question', 'q')
      .select('l.kcId', 'kcId')
      .addSelect('q.xesQuestionId', 'xesQuestionId')
      .where('l.kcId IN (:...kcIds)', { kcIds })
      .andWhere('q.xesQuestionId IS NOT NULL')
      .andWhere('q.reviewStatus = :status', { status: QuestionReviewStatus.APPROVED })
      .andWhere('q.isActive = true')
      .getRawMany<{ kcId: string; xesQuestionId: number }>();

    const byKc = new Map<string, Set<number>>();
    for (const r of rows) {
      const set = byKc.get(r.kcId) ?? new Set<number>();
      set.add(r.xesQuestionId);
      byKc.set(r.kcId, set);
    }
    return new Map([...byKc].map(([kcId, set]) => [kcId, thin([...set].sort((a, b) => a - b), SAMPLE_PER_KC)]));
  }
}

/** At most `max` items spread evenly over the sorted list. */
const thin = (sorted: number[], max: number): number[] => {
  if (sorted.length <= max) return sorted;
  return Array.from({ length: max }, (_, i) => sorted[Math.round((i * (sorted.length - 1)) / (max - 1))]);
};
