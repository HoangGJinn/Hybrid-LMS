import { EXAM_MAX_SCORE } from '../constants/exam-rules.constant.js';

export interface GradableQuestion {
  readonly id: string;
  readonly correctOptionId: string | null;
}

export interface GradeSummary {
  readonly correctCount: number;
  readonly totalQuestions: number;
  readonly score: number;
}

/**
 * Grades a multiple-choice attempt on a 10-point scale, rounded to 2 decimal places.
 * Unanswered questions count as wrong.
 */
export const gradeMultipleChoiceAttempt = (
  questions: readonly GradableQuestion[],
  selectedByQuestionId: ReadonlyMap<string, string>,
): GradeSummary => {
  const totalQuestions = questions.length;
  if (totalQuestions === 0) {
    return { correctCount: 0, totalQuestions: 0, score: 0 };
  }
  const correctCount = questions.filter((question) => {
    const selected = selectedByQuestionId.get(question.id);
    return (
      selected !== undefined &&
      question.correctOptionId !== null &&
      selected === question.correctOptionId
    );
  }).length;
  const rawScore = (correctCount / totalQuestions) * EXAM_MAX_SCORE;
  const score = Math.round(rawScore * 100) / 100;
  return { correctCount, totalQuestions, score };
};

