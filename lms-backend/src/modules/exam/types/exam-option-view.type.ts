import type { ExamQuestionOption } from '../entities/exam-question-option.entity.js';

/** One answer as the lecturer sees it, including whether it is the correct one. */
export class ExamOptionView {
  readonly id: string;
  readonly content: string;
  readonly isCorrect: boolean;

  private constructor(entity: ExamQuestionOption) {
    this.id = entity.id;
    this.content = entity.content;
    this.isCorrect = entity.isCorrect;
  }

  /** Maps an entity to its view without leaking the entity itself. */
  static fromEntity(entity: ExamQuestionOption): ExamOptionView {
    return new ExamOptionView(entity);
  }
}
