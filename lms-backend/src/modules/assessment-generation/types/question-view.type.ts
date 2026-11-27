import type { QuestionDifficulty } from '../enums/question-difficulty.enum.js';
import type { QuestionReviewStatus } from '../enums/question-review-status.enum.js';
import type { QuestionSource } from '../enums/question-source.enum.js';

export interface QuestionOptionView {
  id: string;
  optionLabel: string;
  optionText: string;
  isCorrect: boolean;
}

export interface QuestionKcView {
  kcId: string;
  name: string;
  /** Leaf names of the confirmed XES3G5M KCs this KC is mapped to (empty when not confirmed yet). */
  xesKcs: string[];
}

export interface QuestionView {
  id: string;
  subjectId: string;
  source: QuestionSource;
  importBatchId: string | null;
  questionText: string;
  difficulty: QuestionDifficulty;
  explanation: string | null;
  reviewStatus: QuestionReviewStatus;
  reviewedBy: string | null;
  isActive: boolean;
  /** Id of the mapped XES3G5M question; null until the KC mapping is confirmed. */
  xesQuestionId: number | null;
  createdAt: Date;
  options: QuestionOptionView[];
  knowledgeComponents: QuestionKcView[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}