export interface KnowledgeComponent {
  id: string;
  name: string;
}

export interface KcMastery {
  id: string;
  kcId: string;
  kcName: string;
  /** 0..1: mean P(correct) predicted by ENAS-KT over a sample of the KC's questions. */
  pMastery: number;
  /** Value before the last update (null the first time): drives the trend arrow. */
  pPrev: number | null;
  /** Number of questions the model scored to get pMastery. */
  sampleSize: number;
  attemptsCount: number;
  correctCount: number;
  /** 'enas' = model prediction, 'history' = recent accuracy (fallback when the model is offline). */
  source: 'enas' | 'history';
  lastUpdated: string;
  nextReviewAt: string | null;
  intervalDays: number | null;
}

export interface SubjectCompetency {
  id: string;
  subjectId: string;
  subjectName: string;
  abilityScore: number;
  quizzesTaken: number;
}
