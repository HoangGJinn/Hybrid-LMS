import { Injectable } from '@nestjs/common';
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
import { computeMasteryByKc } from '../utils/mastery.js';
import { randomIndex, randomUnit } from '../utils/random.js';

/** Questions answered correctly within this many days are skipped while enough others remain. */
const RECENT_CORRECT_DAYS = 14;
const HISTORY_ROWS = 2000;

@Injectable()
export class RuleBasedQuestionSelector implements QuestionSelector {
  constructor(
    @InjectRepository(QuestionKnowledgeComponent)
    private readonly links: Repository<QuestionKnowledgeComponent>,
    @InjectRepository(QuizInstanceAnswer)
    private readonly answers: Repository<QuizInstanceAnswer>,
  ) {}

  async select(input: SelectQuestionsInput): Promise<SelectedQuestion[]> {
    const { studentId, subjectId, kcIds, count, focus } = input;
    if (kcIds.length === 0 || count <= 0) return [];

    // The one place that decides which questions are eligible (approved, active, this subject).
    // A visibility / owner filter for per-lecturer question banks would be added here.
    const rows = await this.links
      .createQueryBuilder('l')
      .innerJoin('l.question', 'q')
      .select('l.questionId', 'questionId')
      .addSelect('l.kcId', 'kcId')
      .where('q.subjectId = :subjectId', { subjectId })
      .andWhere('q.reviewStatus = :status', { status: QuestionReviewStatus.APPROVED })
      .andWhere('q.isActive = true')
      .andWhere('l.kcId IN (:...kcIds)', { kcIds })
      .getRawMany<{ questionId: string; kcId: string }>();

    if (rows.length === 0) return [];

    const allIds = [...new Set(rows.map((r) => r.questionId))];
    const skip = await this.recentlyCorrect(studentId, allIds);
    const keepAll = allIds.length - skip.size < count;

    const pools = new Map<string, string[]>();
    for (const r of rows) {
      if (!keepAll && skip.has(r.questionId)) continue;
      const pool = pools.get(r.kcId) ?? [];
      pool.push(r.questionId);
      pools.set(r.kcId, pool);
    }

    const weights = await this.weightsFor([...pools.keys()], studentId, focus);
    return this.pick(pools, weights, count);
  }

  private async recentlyCorrect(studentId: string, questionIds: string[]): Promise<Set<string>> {
    const since = new Date(Date.now() - RECENT_CORRECT_DAYS * 24 * 60 * 60 * 1000);
    const rows = await this.answers.find({
      select: { questionId: true },
      where: {
        studentId,
        isCorrect: true,
        questionId: In(questionIds),
        answeredAt: MoreThan(since),
      },
    });
    return new Set(rows.map((r) => r.questionId));
  }

  /** WEAK: KCs the student knows less get more questions. Untried KCs count as medium. EVEN: all equal. */
  private async weightsFor(
    kcIds: string[],
    studentId: string,
    focus: SelectQuestionsInput['focus'],
  ): Promise<Map<string, number>> {
    const weights = new Map<string, number>(kcIds.map((id) => [id, 1]));
    if (focus === 'EVEN' || kcIds.length === 0) return weights;

    const history = await this.answers.find({
      select: { kcId: true, isCorrect: true, answeredAt: true },
      where: { studentId, kcId: In(kcIds) },
      order: { answeredAt: 'DESC' },
      take: HISTORY_ROWS,
    });
    const mastery = computeMasteryByKc(history);
    for (const id of kcIds) {
      const m = mastery.get(id)?.mastery ?? 0.5;
      weights.set(id, 0.5 + 2 * (1 - m));
    }
    return weights;
  }

  /** Repeatedly picks a KC by weight among those that still have questions, then a random question of it. */
  private pick(
    pools: Map<string, string[]>,
    weights: Map<string, number>,
    count: number,
  ): SelectedQuestion[] {
    const chosen: SelectedQuestion[] = [];
    const used = new Set<string>();
    const remaining = new Map<string, string[]>(
      [...pools].map(([kc, ids]) => [kc, [...ids]]),
    );

    while (chosen.length < count) {
      const open = [...remaining].filter(([, ids]) => ids.length > 0);
      if (open.length === 0) break;

      const total = open.reduce((sum, [kc]) => sum + (weights.get(kc) ?? 1), 0);
      let target = randomUnit() * total;
      let [kcId, ids] = open[open.length - 1];
      for (const entry of open) {
        target -= weights.get(entry[0]) ?? 1;
        if (target < 0) {
          [kcId, ids] = entry;
          break;
        }
      }

      const [questionId] = ids.splice(randomIndex(ids.length), 1);
      if (used.has(questionId)) continue; // already chosen through another KC
      used.add(questionId);
      chosen.push({ questionId, kcId });
    }
    return chosen;
  }
}