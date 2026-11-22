import { AssignmentStatus } from '../enums/assignment-status.enum.js';

interface Schedule {
  readonly openAt: Date;
  readonly endAt: Date;
}

/** Status of an assignment for a student: a submission wins over the deadline, a grade wins over a plain submission. */
export const computeAssignmentStatus = (
  schedule: Schedule,
  submission: { readonly score: number | string | null } | null,
  now: Date,
): AssignmentStatus => {
  if (submission) {
    return submission.score === null
      ? AssignmentStatus.SUBMITTED
      : AssignmentStatus.GRADED;
  }
  if (now < schedule.openAt) return AssignmentStatus.UPCOMING;
  if (now > schedule.endAt) return AssignmentStatus.OVERDUE;
  return AssignmentStatus.OPEN;
};