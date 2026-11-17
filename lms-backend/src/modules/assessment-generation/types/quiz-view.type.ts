import type { QuestionDifficulty } from '../enums/question-difficulty.enum.js';
import { QuestionType } from '../enums/question-type.enum.js';
import type { QuizInstanceStatus } from '../enums/quiz-instance-status.enum.js';

export interface QuizOptionView {
  id: string;
  text: string; // never says which option is correct
}

/** Revealed once a question is answered (or the quiz is submitted). */
export interface QuizAnswerFeedback {
  selectedOptionId: string | null; // multiple choice; null: left unanswered or fill-blank
  answerText: string | null; // fill-blank: what the student typed
  isCorrect: boolean;
  correctOptionId: string | null; // multiple choice only
  correctAnswers: string[]; // fill-blank: accepted answers (empty for multiple choice)
  explanation: string | null;
}

export interface QuizQuestionView {
  id: string; // quiz_instance_questions.id: the id to answer with
  orderIndex: number;
  questionText: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  knowledgeComponents: { kcId: string; name: string }[];
  options: QuizOptionView[];
  answer: QuizAnswerFeedback | null;
}

export interface QuizView {
  id: string;
  subjectId: string;
  title: string;
  status: QuizInstanceStatus;
  numQuestions: number;
  answeredCount: number;
  score: number | null; // 0..100
  correctCount: number | null;
  createdAt: Date;
  submittedAt: Date | null;
  questions: QuizQuestionView[];
}

export interface QuizSummaryView {
  id: string;
  subjectId: string;
  title: string;
  status: QuizInstanceStatus;
  numQuestions: number;
  score: number | null;
  correctCount: number | null;
  createdAt: Date;
  submittedAt: Date | null;
}

export interface KcBreakdownView {
  kcId: string;
  name: string;
  correct: number;
  total: number;
  /** 0..1, null when the student had no answers on this KC. */
  masteryBefore: number | null;
  masteryAfter: number | null;
}

export interface QuizResultView {
  quiz: QuizView;
  kcBreakdown: KcBreakdownView[];
} 

export interface KcMasteryView {
  kcId: string;
  name: string;
  attempted: number;
  correct: number;
  /** 0..1, null when never answered. */
  mastery: number | null;
}

/** What the practice panel of a document needs: the subject, the document's title and its topics with progress. */
export interface PracticeInfoView {
  subjectId: string;
  documentTitle: string;
  kcs: KcMasteryView[];
}