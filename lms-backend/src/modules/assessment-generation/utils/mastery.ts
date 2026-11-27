/** Number of most recent answers per knowledge component that count towards its mastery. */
export const MASTERY_WINDOW = 20;

export interface AnswerSample {
  kcId: string | null;
  isCorrect: boolean;
  answeredAt: Date;
}

export interface KcMastery {
  attempted: number;
  correct: number;
  /** Share of correct answers among the last MASTERY_WINDOW answers, 0..1. */
  mastery: number;
}

/**
 * Simple stand-in for the knowledge-tracing model: mastery of a KC is the share of correct answers
 * among the student's most recent answers on it. Answers without a KC are ignored.
 */
export const computeMasteryByKc = (
  samples: AnswerSample[],
  window: number = MASTERY_WINDOW,
): Map<string, KcMastery> => {
  const byKc = new Map<string, AnswerSample[]>();
  for (const s of samples) {
    if (!s.kcId) continue;
    const list = byKc.get(s.kcId) ?? [];
    list.push(s);
    byKc.set(s.kcId, list);
  }

  const result = new Map<string, KcMastery>();
  for (const [kcId, list] of byKc) {
    const recent = [...list]
      .sort((a, b) => b.answeredAt.getTime() - a.answeredAt.getTime())
      .slice(0, window);
    const correct = recent.filter((s) => s.isCorrect).length;
    result.set(kcId, {
      attempted: recent.length,
      correct,
      mastery: recent.length === 0 ? 0 : correct / recent.length,
    });
  }
  return result;
};

export type MasteryLevel = 'NEW' | 'WEAK' | 'UNSURE' | 'GOOD' | 'MASTERED';
export type MasteryConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
/** How a question fits the student: EASY is a warm-up, CHALLENGE is a stretch. */
export type QuestionFit = 'EASY' | 'FIT' | 'CHALLENGE';

/** Mastery (0..1) as a label. A KC the student never answered is NEW whatever the model says. */
export const masteryLevel = (mastery: number | null, attempted: number): MasteryLevel => {
  if (mastery === null || attempted === 0) return 'NEW';
  if (mastery >= 0.8) return 'MASTERED';
  if (mastery >= 0.6) return 'GOOD';
  if (mastery >= 0.4) return 'UNSURE';
  return 'WEAK';
};

/** The more answers a KC has, the more the estimate can be trusted. */
export const masteryConfidence = (attempted: number): MasteryConfidence => {
  if (attempted < 3) return 'LOW';
  if (attempted < 6) return 'MEDIUM';
  return 'HIGH';
};

/** Predicted P(correct) of one question for this student as a label; null when no prediction was made. */
export const questionFit = (pCorrect: number | null): QuestionFit | null => {
  if (pCorrect === null) return null;
  if (pCorrect >= 0.75) return 'EASY';
  if (pCorrect < 0.45) return 'CHALLENGE';
  return 'FIT';
};
