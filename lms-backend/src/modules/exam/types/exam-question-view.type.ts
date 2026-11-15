import type { ExamQuestionOption } from '../entities/exam-question-option.entity.js';
import type { ExamQuestion } from '../entities/exam-question.entity.js';
import { ExamOptionView } from './exam-option-view.type.js';

/** One question with its answers in display order. */
export class ExamQuestionView {
  readonly id: string;
  readonly content: string;
  readonly orderIndex: number;
  readonly options: readonly ExamOptionView[];

  private constructor(
    entity: ExamQuestion,
    options: readonly ExamQuestionOption[],
  ) {
    this.id = entity.id;
    this.content = entity.content;
    this.orderIndex = entity.orderIndex;
    this.options = options.map((option) => ExamOptionView.fromEntity(option));
  }

  /** Maps a question and its option rows to the view. */
  static fromEntity(
    entity: ExamQuestion,
    options: readonly ExamQuestionOption[],
  ): ExamQuestionView {
    return new ExamQuestionView(entity, options);
  }
}
