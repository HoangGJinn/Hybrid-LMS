import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { QuestionKnowledgeComponent } from '../entities/question-knowledge-component.entity.js';
import { QuestionOption } from '../entities/question-option.entity.js';
import { Question } from '../entities/question.entity.js';
import { QuestionReviewStatus } from '../enums/question-review-status.enum.js';
import type { Paged, QuestionView } from '../types/question-view.type.js';

export interface ListQuestionsFilter {
  subjectId: string;
  reviewStatus?: QuestionReviewStatus;
  isActive?: boolean;
  importBatchId?: string;
  page: number;
  limit: number;
}

const MAX_PAGE_SIZE = 100;

@Injectable()
export class QuestionManagementService {
  constructor(
    @InjectRepository(Question)
    private readonly questions: Repository<Question>,
    @InjectRepository(QuestionOption)
    private readonly options: Repository<QuestionOption>,
    @InjectRepository(QuestionKnowledgeComponent)
    private readonly links: Repository<QuestionKnowledgeComponent>,
  ) {}

  async list(filter: ListQuestionsFilter): Promise<Paged<QuestionView>> {
    const page = Math.max(1, filter.page);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filter.limit));

    const where: FindOptionsWhere<Question> = { subjectId: filter.subjectId };
    if (filter.reviewStatus) where.reviewStatus = filter.reviewStatus;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.importBatchId) where.importBatchId = filter.importBatchId;

    const [rows, total] = await this.questions.findAndCount({
      where,
      // id as tie-breaker keeps pagination stable for questions created in the same instant.
      order: { createdAt: 'DESC', id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items: await this.toViews(rows), total, page, limit };
  }

  /** `reviewerId` is the lecturer's user id (questions.reviewed_by references lecturers). */
  async review(
    questionId: string,
    reviewerId: string,
    reviewStatus: QuestionReviewStatus.APPROVED | QuestionReviewStatus.REJECTED,
  ): Promise<QuestionView> {
    const question = await this.getOrThrow(questionId);
    question.reviewStatus = reviewStatus;
    question.reviewedBy = reviewerId;
    await this.questions.save(question);
    return (await this.toViews([question]))[0];
  }

  async setActive(questionId: string, isActive: boolean): Promise<QuestionView> {
    const question = await this.getOrThrow(questionId);
    question.isActive = isActive;
    await this.questions.save(question);
    return (await this.toViews([question]))[0];
  }

  private async getOrThrow(questionId: string): Promise<Question> {
    const question = await this.questions.findOne({ where: { id: questionId } });
    if (!question) throw new NotFoundException('Không tìm thấy câu hỏi.');
    return question;
  }

  /** Loads options and KC names for a page of questions with two queries (no N+1). */
  private async toViews(questions: Question[]): Promise<QuestionView[]> {
    if (questions.length === 0) return [];
    const ids = questions.map((q) => q.id);

    const [options, links] = await Promise.all([
      this.options.find({ where: { questionId: In(ids) }, order: { optionLabel: 'ASC' } }),
      this.links.find({ where: { questionId: In(ids) }, relations: { knowledgeComponent: true } }),
    ]);

    return questions.map((q) => ({
      id: q.id,
      subjectId: q.subjectId,
      source: q.source,
      importBatchId: q.importBatchId,
      questionText: q.questionText,
      difficulty: q.difficulty,
      explanation: q.explanation,
      reviewStatus: q.reviewStatus,
      reviewedBy: q.reviewedBy,
      isActive: q.isActive,
      createdAt: q.createdAt,
      options: options
        .filter((o) => o.questionId === q.id)
        .map((o) => ({
          id: o.id,
          optionLabel: o.optionLabel,
          optionText: o.optionText,
          isCorrect: o.isCorrect,
        })),
      knowledgeComponents: links
        .filter((l) => l.questionId === q.id)
        .map((l) => ({ kcId: l.kcId, name: l.knowledgeComponent.name })),
    }));
  }
}