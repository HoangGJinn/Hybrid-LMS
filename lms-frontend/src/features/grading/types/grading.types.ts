import type { Assignment, AssignmentSubmission } from '@features/assignments';

/** A submission together with the assignment it belongs to (lecturer grading queue). */
export interface PendingSubmission extends AssignmentSubmission {
  assignment: Assignment;
}

/** One row of a student's per-course grade table. */
export interface GradeRow {
  assignment: Assignment;
  submission: AssignmentSubmission | null;
}
