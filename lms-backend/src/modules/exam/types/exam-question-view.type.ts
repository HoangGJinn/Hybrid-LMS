import type { ExamQuestionOption } from '../entities/exam-question-option.entity.js';
import type { ExamQuestion } from '../entities/exam-question.entity.js';
import { ExamQuestionType } from '../enums/exam-question-type.enum.js';
import { ExamOptionView } from './exam-option-view.type.js';

/** One question with its answers or blank definitions in display order. */
export class ExamQuestionView {
  readonly id: string;
  readonly type: ExamQuestionType;
  readonly content: string;
  readonly correctCount: number;
  readonly orderIndex: number;
  readonly options: readonly ExamOptionView[];

  private constructor(
    entity: ExamQuestion,
    options: readonly ExamQuestionOption[],
  ) {
    this.id = entity.id;
    this.type = entity.type ?? ExamQuestionType.MULTIPLE_CHOICE;
    this.content = entity.content;
    this.correctCount =
      entity.correctCount ??
      (this.type === ExamQuestionType.FILL_IN_THE_BLANK
        ? options.length || 1
        : options.filter((option) => option.isCorrect).length || 1);
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
