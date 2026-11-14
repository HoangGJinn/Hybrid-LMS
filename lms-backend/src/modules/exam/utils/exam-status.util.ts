import { ExamFormat } from '../enums/exam-format.enum.js';
import { ExamStatus } from '../enums/exam-status.enum.js';

/** FILE exams always allow 1 editable attempt; MCQ defaults to 1 when omitted, or keeps null for unlimited. */
export const resolveExamMaxAttempts = (exam: {
  format: ExamFormat;
  maxAttempts?: number | null;
}): number | null => {
  if (exam.format === ExamFormat.FILE) return 1;
  return exam.maxAttempts === undefined ? 1 : exam.maxAttempts;
};

/** The status of an exam at `now`; the schedule alone decides it, never the number of sessions. */
export const resolveExamStatus = (
  exam: { startTime: Date; endTime: Date },
  now: Date,
): ExamStatus => {
  if (now < exam.startTime) return ExamStatus.UPCOMING;
  if (now < exam.endTime) return ExamStatus.OPEN;
  return ExamStatus.CLOSED;
};

/**
 * Questions, answers, format and question file are frozen once students may have seen or started the exam:
 * from the opening time on, or as soon as one session exists. Changing them would make attempts incomparable
 * and could leave chosen answers pointing at nothing.
 */
export const isContentLocked = (
  status: ExamStatus,
  startedCount: number,
): boolean => status !== ExamStatus.UPCOMING || startedCount > 0;

