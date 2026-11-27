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
export type QuestionType = 'MULTIPLE_CHOICE' | 'FILL_BLANK';
/** NEW: never answered. The rest follow the predicted share of questions the student gets right. */
export type MasteryLevel = 'NEW' | 'WEAK' | 'UNSURE' | 'GOOD' | 'MASTERED';
export type MasteryConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
/** enas: predicted by the knowledge-tracing model. history: share of recent correct answers. */
export type MasterySource = 'enas' | 'history';
/** How a question fits the student according to the model. */
export type QuestionFit = 'EASY' | 'FIT' | 'CHALLENGE';

export interface QuizOption {
  id: string;
  text: string;
}

/** Shown once a question is answered, or for every question once the quiz is submitted. */
export interface QuizAnswerFeedback {
  selectedOptionId: string | null; // null: left unanswered
  answerText: string | null;
  isCorrect: boolean;
  correctOptionId: string;
  correctAnswers: string[];
  explanation: string | null;
}

export interface QuizQuestion {
  id: string; // the id to answer with
  orderIndex: number;
  questionText: string;
  difficulty: Difficulty;
  type: QuestionType;
  knowledgeComponents: { kcId: string; name: string }[];
  fit: QuestionFit | null; // null: not picked by the model
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
  adaptive: boolean; // questions were picked by the model
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
  source: MasterySource;
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
  level: MasteryLevel;
  confidence: MasteryConfidence;
  source: MasterySource;
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
  selectedOptionId?: string;
  answerText?: string;
  timeSpentSeconds?: number;
}

