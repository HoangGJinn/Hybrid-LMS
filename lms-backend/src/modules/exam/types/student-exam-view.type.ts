import type { FileDownloadView } from '../../../shared/file/types/file-download-view.type.js';
import type { ExamFormat } from '../enums/exam-format.enum.js';
import type { ExamSessionStatus } from '../enums/exam-session-status.enum.js';
import type { ExamStatus } from '../enums/exam-status.enum.js';

/** One option shown to a student taking an exam — never includes `isCorrect`. */
export interface StudentExamOptionView {
  readonly id: string;
  readonly content: string;
}

/** One question shown to a student taking an exam. */
export interface StudentExamQuestionView {
  readonly id: string;
  readonly content: string;
  readonly orderIndex: number;
  readonly options: readonly StudentExamOptionView[];
}

/** One attempt row in the student's attempt history for an exam. */
export interface StudentExamAttemptItemView {
  readonly id: string;
  readonly attemptNumber: number;
  readonly status: ExamSessionStatus;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly submittedAt?: Date | null;
  readonly gradedAt?: Date | null;
  readonly comment?: string | null;
  /** Null while in progress, awaiting lecturer grading, or when `showResults` is disabled by the lecturer. */
  readonly score: number | null;
}

/** Item in `GET /api/exams/me`: one exam of the student's classes with their attempt summary. */
export interface StudentExamSummaryView {
  readonly id: string;
  readonly classId: string;
  readonly examName: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly durationMinutes: number;
  readonly format: ExamFormat;
  readonly status: ExamStatus;
  readonly maxAttempts: number | null;
  readonly showResults: boolean;
  readonly attemptsUsed: number;
  readonly inProgressSessionId: string | null;
  /** Highest score across completed attempts; null when no attempt is completed or `showResults` is false. */
  readonly bestScore: number | null;
}

/** Lobby overview in `GET /api/classes/:classId/exams/:examId/student`. */
export interface StudentExamLobbyView {
  readonly id: string;
  readonly classId: string;
  readonly examName: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly durationMinutes: number;
  readonly format: ExamFormat;
  readonly status: ExamStatus;
  readonly questionCount: number;
  readonly maxAttempts: number | null;
  readonly showResults: boolean;
  readonly shuffleQuestions: boolean;
  readonly shuffleOptions: boolean;
  readonly attemptsUsed: number;
  readonly bestScore: number | null;
  readonly canStartNewAttempt: boolean;
  readonly activeSessionId: string | null;
  readonly attempts: readonly StudentExamAttemptItemView[];
  readonly serverNow: Date;
}

/** Active attempt returned by `POST /api/classes/:classId/exams/:examId/sessions`. */
export interface ExamAttemptView {
  readonly session: {
    readonly id: string;
    readonly examScheduleId: string;
    readonly attemptNumber: number;
    readonly status: ExamSessionStatus;
    readonly startedAt: Date;
    readonly endedAt: Date | null;
    readonly submittedAt?: Date | null;
  };
  readonly exam: {
    readonly id: string;
    readonly classId: string;
    readonly examName: string;
    readonly format?: ExamFormat;
    readonly startTime: Date;
    readonly endTime: Date;
    readonly durationMinutes: number;
    readonly maxAttempts: number | null;
    readonly showResults: boolean;
  };
  readonly deadline: Date;
  readonly serverNow: Date;
  readonly questions: readonly StudentExamQuestionView[];
  /** Previously saved answers from `exam_session_answers` (`questionId -> selectedOptionId`). */
  readonly savedAnswers: Readonly<Record<string, string>>;
  /** For FILE exams: signed download link for the lecturer's question file. */
  readonly questionFile?: FileDownloadView | null;
  /** For FILE exams: signed download links for files the student has already submitted in this attempt. */
  readonly submittedFiles?: readonly FileDownloadView[];
}

/** Response of `PUT /api/exam-sessions/:sessionId/answers`. */
export interface SaveExamAnswersResultView {
  readonly savedQuestionIds: readonly string[];
  readonly savedAt: Date;
  readonly deadline: Date;
  readonly serverNow: Date;
}

/** Response of `PUT /api/exam-sessions/:sessionId/file-submission`. */
export interface SaveFileSubmissionResultView {
  readonly sessionId: string;
  readonly submittedAt: Date;
  readonly submittedFiles: readonly FileDownloadView[];
  readonly deadline: Date;
  readonly serverNow: Date;
}

/** Response of `POST /api/exam-sessions/:sessionId/submit`. */
export interface SubmitExamResultView {
  readonly sessionId: string;
  readonly examId: string;
  readonly classId: string;
  readonly attemptNumber: number;
  readonly status: ExamSessionStatus;
  readonly startedAt: Date;
  readonly endedAt: Date;
  readonly showResults: boolean;
  readonly score: number | null;
  readonly correctCount: number | null;
  readonly totalQuestions: number;
}

/** Question in the post-submission review (`GET /api/exam-sessions/:sessionId/review`). */
export interface ExamReviewQuestionView {
  readonly id: string;
  readonly content: string;
  readonly selectedOptionId: string | null;
  readonly options: readonly {
    readonly id: string;
    readonly content: string;
    readonly isCorrect: boolean;
  }[];
}

/** Full review of a completed (or submitted FILE) attempt when `exam.showResults === true`. */
export interface ExamAttemptReviewView {
  readonly sessionId: string;
  readonly examId: string;
  readonly classId: string;
  readonly examName: string;
  readonly format?: ExamFormat;
  readonly attemptNumber: number;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly submittedAt?: Date | null;
  readonly gradedAt?: Date | null;
  readonly comment?: string | null;
  readonly score: number | null;
  readonly correctCount: number;
  readonly totalQuestions: number;
  readonly questions: readonly ExamReviewQuestionView[];
  readonly questionFile?: FileDownloadView | null;
  readonly submittedFiles?: readonly FileDownloadView[];
}


