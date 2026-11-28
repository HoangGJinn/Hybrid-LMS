/** One row of the "Knowledge components" list of the Knowledge Mastery tab. */
export interface KcMasteryRowView {
  id: string;
  kcId: string;
  kcName: string;
  subjectId: string;
  /** 0..1, mean P(correct) predicted by ENAS-KT (or recent accuracy when source is 'history'). */
  pMastery: number;
  /** Value before the last update, null the first time: shows the trend. */
  pPrev: number | null;
  /** Number of questions the model scored to get pMastery. */
  sampleSize: number;
  attemptsCount: number;
  correctCount: number;
  source: 'enas' | 'history';
  /** Position of the prediction in the gateway log (/monitor), null when unknown. */
  enasLogSeq: number | null;
  lastUpdated: Date;
  nextReviewAt: Date | null;
  intervalDays: number | null;
}

export interface SubjectCompetencyRowView {
  id: string;
  subjectId: string;
  subjectName: string;
  /** 0..100 */
  abilityScore: number;
  quizzesTaken: number;
}
