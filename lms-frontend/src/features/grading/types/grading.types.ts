import type {
  Assignment,
  AssignmentFileLink,
  AssignmentSubmission,
} from '@features/assignments';
import type { ExamFileLink, ExamSessionStatus } from '@features/exams';

/** A submission together with the assignment it belongs to (lecturer grading queue). */
export interface PendingSubmission extends AssignmentSubmission {
  assignment: Assignment;
}

/** One FILE exam attempt in the lecturer's cross-class grading queue. */
export interface PendingExamSubmission {
  sessionId: string;
  examId: string;
  classId: string;
  examName: string;
  attemptNumber: number;
  studentId: string;
  studentCode: string;
  studentName: string;
  email: string;
  status: ExamSessionStatus;
  startedAt: string;
  endedAt: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  score: number | null;
  comment: string | null;
  questionFile: ExamFileLink | null;
  submittedFiles: ExamFileLink[];
}

export type GradingItemKind = 'assignment' | 'exam';

interface BaseGradingQueueItem {
  queueId: string;
  kind: GradingItemKind;
  classId: string;
  className: string;
  title: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  submittedAt: string;
  score: number | null;
  comment: string | null;
  files: Array<AssignmentFileLink | ExamFileLink>;
}

export interface AssignmentGradingQueueItem extends BaseGradingQueueItem {
  kind: 'assignment';
  submission: PendingSubmission;
  answerText: string | null;
}

export interface ExamGradingQueueItem extends BaseGradingQueueItem {
  kind: 'exam';
  examSubmission: PendingExamSubmission;
  examId: string;
  sessionId: string;
  attemptNumber: number;
  questionFile: ExamFileLink | null;
}

/** Unified grading queue item shown on Grading Desk and Lecturer Dashboard. */
export type GradingQueueItem = AssignmentGradingQueueItem | ExamGradingQueueItem;

/** One row of a student's per-course grade table. */
export interface GradeRow {
  assignment: Assignment;
  submission: AssignmentSubmission | null;
}
