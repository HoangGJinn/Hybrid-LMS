// export type QuizInstanceStatus =
//   'CREATED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
// export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

// export interface QuizQuestion {
//   id: string;
//   content: string;
//   options: string[];
//   correctIndex: number;
//   kcId: string;
//   explanation: string;
// }

// export interface QuizInstance {
//   id: string;
//   generationJobId: string;
//   studentId: string;
//   title: string;
//   targetDifficulty: Difficulty;
//   numQuestions: number;
//   status: QuizInstanceStatus;
//   score: number | null;
//   createdAt: string;
//   questions: QuizQuestion[];
// }

// export interface QuizAnswer {
//   questionId: string;
//   selectedIndex: number;
// }


export type QuizStatus = 'CREATED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuizFocus = 'WEAK' | 'EVEN';
export type QuizSize = 5 | 10 | 15;

export interface QuizOption {
  id: string;
  text: string;
}

/** Shown once a question is answered, or for every question once the quiz is submitted. */
export interface QuizAnswerFeedback {
  selectedOptionId: string | null; // null: left unanswered
  isCorrect: boolean;
  correctOptionId: string;
  explanation: string | null;
}

export interface QuizQuestion {
  id: string; // the id to answer with
  orderIndex: number;
  questionText: string;
  difficulty: Difficulty;
  knowledgeComponents: { kcId: string; name: string }[];
  options: QuizOption[];
  answer: QuizAnswerFeedback | null;
}

export interface Quiz {
  id: string;
  subjectId: string;
  title: string;
  status: QuizStatus;
  numQuestions: number;
  answeredCount: number;
  score: number | null; // 0..100
  correctCount: number | null;
  createdAt: string;
  submittedAt: string | null;
  questions: QuizQuestion[];
}

export interface QuizSummary {
  id: string;
  subjectId: string;
  title: string;
  status: QuizStatus;
  numQuestions: number;
  score: number | null;
  correctCount: number | null;
  createdAt: string;
  submittedAt: string | null;
}

export interface KcBreakdown {
  kcId: string;
  name: string;
  correct: number;
  total: number;
  masteryBefore: number | null; // 0..1
  masteryAfter: number | null;
}

export interface QuizResult {
  quiz: Quiz;
  kcBreakdown: KcBreakdown[];
}

export interface KcMastery {
  kcId: string;
  name: string;
  attempted: number;
  correct: number;
  mastery: number | null; // 0..1, null: never answered
}

export interface PracticeInfo {
  subjectId: string;
  documentTitle: string;
  kcs: KcMastery[];
}

export interface CreateQuizInput {
  subjectId: string;
  numQuestions: QuizSize;
  kcIds?: string[];
  focus?: QuizFocus;
  title?: string;
}

export interface AnswerInput {
  quizInstanceQuestionId: string;
  selectedOptionId: string;
  timeSpentSeconds?: number;
}