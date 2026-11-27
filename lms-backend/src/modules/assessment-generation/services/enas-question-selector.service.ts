import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { QuestionKnowledgeComponent } from '../entities/question-knowledge-component.entity.js';
import { QuizInstanceAnswer } from '../entities/quiz-instance-answer.entity.js';
import { QuestionReviewStatus } from '../enums/question-review-status.enum.js';
import type {
  QuestionSelector,
  SelectedQuestion,
  SelectQuestionsInput,
} from '../types/question-selector.type.js';
import { randomIndex, randomUnit } from '../utils/random.js';
import { EnasGatewayClient } from './enas-gateway.client.js';
import { EnasMasteryService } from './enas-mastery.service.js';
import { RuleBasedQuestionSelector } from './rule-based-question-selector.service.js';

/** Questions the student is expected to get right about 60% of the time are the most useful to practise. */
const TARGET_P = 0.6;
/** A question the model has no prediction for is treated as this far from the target. */
const UNKNOWN_DISTANCE = 0.2;
/** The best fits are shuffled so repeated quizzes are not identical. */
const TOP_CHOICES = 3;
/** Questions answered correctly within this many days are skipped while enough others remain. */
const RECENT_CORRECT_DAYS = 14;

interface PoolRow {
  questionId: string;
  kcId: string;
  xesQuestionId: number | null;
}

/**
 * Picks quiz questions with the ENAS-KT model:
 *   1. the student's answers (mapped to XES3G5M question ids) are sent with every candidate question to the gateway,
 *   2. the mastery of a KC is the mean predicted P(correct) over its candidate questions,
 *   3. WEAK focus draws more questions from low-mastery KCs, EVEN draws equally,
 *   4. inside a KC the questions whose P(correct) is closest to TARGET_P come first.
 * Falls back to the rule-based selector when the model cannot be used (gateway down, questions not mapped to XES).
 * Enabled with QUESTION_SELECTOR=enas.
 */
@Injectable()
export class EnasQuestionSelector implements QuestionSelector {
  private readonly logger = new Logger(EnasQuestionSelector.name);

  constructor(
    @InjectRepository(QuestionKnowledgeComponent)
    private readonly links: Repository<QuestionKnowledgeComponent>,
    @InjectRepository(QuizInstanceAnswer)
    private readonly answers: Repository<QuizInstanceAnswer>,
    private readonly gateway: EnasGatewayClient,
    private readonly enasMastery: EnasMasteryService,
    private readonly fallback: RuleBasedQuestionSelector,
  ) {}

  async select(input: SelectQuestionsInput): Promise<SelectedQuestion[]> {
    if (input.kcIds.length === 0 || input.count <= 0) return [];
    try {
      const picked = await this.selectWithModel(input);
      if (picked) return picked;
    } catch (err) {
      this.logger.warn(`ENAS selection failed, using rule-based: ${err instanceof Error ? err.message : String(err)}`);
    }
    return this.fallback.select(input);
  }

  /** Returns null when the model cannot be used for this request. */
  private async selectWithModel(input: SelectQuestionsInput): Promise<SelectedQuestion[] | null> {
    const { studentId, subjectId, kcIds, count, focus } = input;

    const rows = await this.links
      .createQueryBuilder('l')
      .innerJoin('l.question', 'q')
      .select('l.questionId', 'questionId')
      .addSelect('l.kcId', 'kcId')
      .addSelect('q.xesQuestionId', 'xesQuestionId')
      .where('q.subjectId = :subjectId', { subjectId })
      .andWhere('q.reviewStatus = :status', { status: QuestionReviewStatus.APPROVED })
      .andWhere('q.isActive = true')
      .andWhere('l.kcId IN (:...kcIds)', { kcIds })
      .getRawMany<PoolRow>();
    if (rows.length === 0) return [];

    const candidates = [...new Set(rows.flatMap((r) => (r.xesQuestionId === null ? [] : [r.xesQuestionId])))];
    if (candidates.length === 0) return null; // no question is mapped to XES yet

    const p = await this.gateway.predict(
      await this.enasMastery.history(studentId),
      candidates,
      undefined,
      { purpose: 'select', student: studentId },
    );
    if (p.size === 0) return null;

    const allIds = [...new Set(rows.map((r) => r.questionId))];
    const skip = await this.recentlyCorrect(studentId, allIds);
    const keepAll = allIds.length - skip.size < count;

    // pool per KC; a question linked to several KCs appears in each of them
    const pools = new Map<string, PoolRow[]>();
    for (const r of rows) {
      if (!keepAll && skip.has(r.questionId)) continue;
      pools.set(r.kcId, [...(pools.get(r.kcId) ?? []), r]);
    }

    const pOf = (r: PoolRow): number | undefined => (r.xesQuestionId === null ? undefined : p.get(r.xesQuestionId));
    const weights = new Map<string, number>();
    for (const [kcId, pool] of pools) {
      const known = [...new Set(pool.map((r) => r.xesQuestionId))]
        .map((x) => (x === null ? undefined : p.get(x)))
        .filter((v): v is number => v !== undefined);
      const mastery = known.length > 0 ? known.reduce((s, v) => s + v, 0) / known.length : 0.5;
      weights.set(kcId, focus === 'EVEN' ? 1 : 0.5 + 2 * (1 - mastery));
    }

    return this.pick(pools, weights, pOf, count);
  }

  private async recentlyCorrect(studentId: string, questionIds: string[]): Promise<Set<string>> {
    const since = new Date(Date.now() - RECENT_CORRECT_DAYS * 24 * 60 * 60 * 1000);
    const rows = await this.answers.find({
      select: { questionId: true },
      where: { studentId, isCorrect: true, questionId: In(questionIds), answeredAt: MoreThan(since) },
    });
    return new Set(rows.map((r) => r.questionId));
  }

  /** Repeatedly picks a KC by weight among those with questions left, then one of its best-fitting questions. */
  private pick(
    pools: Map<string, PoolRow[]>,
    weights: Map<string, number>,
    pOf: (r: PoolRow) => number | undefined,
    count: number,
  ): SelectedQuestion[] {
    const distance = (r: PoolRow): number => {
      const v = pOf(r);
      return v === undefined ? UNKNOWN_DISTANCE : Math.abs(v - TARGET_P);
    };
    const remaining = new Map<string, PoolRow[]>(
      [...pools].map(([kc, list]) => [kc, [...list].sort((a, b) => distance(a) - distance(b))]),
    );
    const chosen: SelectedQuestion[] = [];
    const used = new Set<string>();

    while (chosen.length < count) {
      const open = [...remaining].filter(([, list]) => list.length > 0);
      if (open.length === 0) break;

      const total = open.reduce((sum, [kc]) => sum + (weights.get(kc) ?? 1), 0);
      let target = randomUnit() * total;
      let [kcId, list] = open[open.length - 1];
      for (const entry of open) {
        target -= weights.get(entry[0]) ?? 1;
        if (target < 0) {
          [kcId, list] = entry;
          break;
        }
      }

      const [row] = list.splice(randomIndex(Math.min(TOP_CHOICES, list.length)), 1);
      if (used.has(row.questionId)) continue; // already chosen through another KC
      used.add(row.questionId);
      const v = pOf(row);
      chosen.push({
        questionId: row.questionId,
        kcId,
        ...(v === undefined ? {} : { pCorrect: Math.round(v * 1000) / 1000 }),
      });
    }
    return chosen;
  }
}