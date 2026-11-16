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