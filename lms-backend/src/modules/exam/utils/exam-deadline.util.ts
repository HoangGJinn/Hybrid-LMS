import {
  EXAM_GRACE_PERIOD_MS,
  MS_PER_MINUTE,
} from '../constants/exam-rules.constant.js';

export interface ExamScheduleWindow {
  readonly endTime: Date;
  readonly durationMinutes: number;
}

/**
 * Computes the server-authoritative deadline of an exam attempt:
 * `min(startedAt + durationMinutes, endTime)`.
 * When the lecturer extends `endTime` or `durationMinutes`, an in-progress attempt automatically benefits.
 */
export const computeSessionDeadline = (
  exam: ExamScheduleWindow,
  startedAt: Date,
): Date => {
  const byDuration = startedAt.getTime() + exam.durationMinutes * MS_PER_MINUTE;
  const cutoff = Math.min(byDuration, exam.endTime.getTime());
  return new Date(cutoff);
};

/**
 * True when `now` is past `deadline + graceMs`. Inside the grace window, saving answers and submitting
 * are still accepted to tolerate network latency.
 */
export const isPastDeadlineWithGrace = (
  deadline: Date,
  now: Date,
  graceMs: number = EXAM_GRACE_PERIOD_MS,
): boolean => now.getTime() > deadline.getTime() + graceMs;

