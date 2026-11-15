import type { FileDownloadView } from '../../../shared/file/types/file-download-view.type.js';
import type { ExamFormat } from '../enums/exam-format.enum.js';
import type { ExamSessionStatus } from '../enums/exam-session-status.enum.js';

export type StudentExamResultStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'GRADED';

/** One attempt of a student in the lecturer's exam results & grading view. */
export interface LecturerExamAttemptItemView {
  readonly sessionId: string;
  readonly attemptNumber: number;
  readonly status: ExamSessionStatus;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly submittedAt: Date | null;
  readonly gradedAt: Date | null;
  readonly score: number | null;
  readonly comment: string | null;
  readonly correctCount: number | null;
  readonly totalQuestions: number;
  readonly submittedFiles: readonly FileDownloadView[];
}

/** One enrolled student row in the lecturer's exam results table (and Summary CSV export). */
export interface LecturerStudentExamResultView {
  readonly studentId: string;
  readonly studentCode: string;
  readonly fullName: string;
  readonly email: string;
  readonly status: StudentExamResultStatus;
  readonly attemptsUsed: number;
  readonly bestScore: number | null;
  readonly latestSessionId: string | null;
  readonly latestSubmittedAt: Date | null;
  readonly gradedAt: Date | null;
  readonly comment: string | null;
  readonly attempts: readonly LecturerExamAttemptItemView[];
}

/** Class-level statistics for an exam. */
export interface LecturerExamResultsSummaryView {
  readonly totalStudents: number;
  readonly startedCount: number;
  readonly submittedCount: number;
  readonly gradedCount: number;
  readonly averageScore: number | null;
  readonly maxScore: number | null;
  readonly minScore: number | null;
}

/** Response of `GET /api/classes/:classId/exams/:examId/results`. */
export interface LecturerExamResultsView {
  readonly examId: string;
  readonly classId: string;
  readonly examName: string;
  readonly format: ExamFormat;
  readonly maxAttempts: number | null;
  readonly summary: LecturerExamResultsSummaryView;
  readonly students: readonly LecturerStudentExamResultView[];
}

/** One FILE exam attempt returned in the lecturer's cross-class grading queue (`GET /api/lecturer/exam-submissions`). */
export interface LecturerExamQueueItemView {
  readonly sessionId: string;
  readonly examId: string;
  readonly classId: string;
  readonly examName: string;
  readonly attemptNumber: number;
  readonly studentId: string;
  readonly studentCode: string;
  readonly studentName: string;
  readonly email: string;
  readonly status: ExamSessionStatus;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly submittedAt: Date | null;
  readonly gradedAt: Date | null;
  readonly score: number | null;
  readonly comment: string | null;
  readonly questionFile: FileDownloadView | null;
  readonly submittedFiles: readonly FileDownloadView[];
}

