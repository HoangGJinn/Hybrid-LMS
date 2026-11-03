export type AssignmentStatus =
  'UPCOMING' | 'OPEN' | 'SUBMITTED' | 'GRADED' | 'OVERDUE';

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  instruction: string;
  openAt: string;
  endAt: string;
  status: AssignmentStatus;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  submittedBy: string;
  studentName: string;
  score: number | null;
  comment: string | null;
  submittedAt: string;
  fileNames: string[];
}

/** A file with a short-lived download link (presigned S3 URL); never store or cache it for long. */
export interface AssignmentFileLink {
  fileId: string;
  fileName: string;
  contentType: string;
  size: number;
  downloadUrl: string;
}

/** The signed-in student's own submission of an assignment. */
export interface MySubmission {
  id: string;
  /** Time of the latest edit. */
  submittedAt: string;
  score: number | null;
  comment: string | null;
  files: AssignmentFileLink[];
}

/** One assignment of a class as the signed-in user sees it. */
export interface AssignmentDetail extends Assignment {
  /** Files the lecturer attached to the brief. */
  files: AssignmentFileLink[];
  /** The student's own submission; always null for lecturers. */
  mySubmission: MySubmission | null;
  /** How many students have submitted (for lecturers). */
  submissionCount: number;
}

/** What a lecturer fills in to create an assignment. */
export interface NewAssignmentInput {
  title: string;
  instruction: string;
  /** ISO 8601 */
  openAt: string;
  /** ISO 8601 */
  endAt: string;
  files: File[];
}

/** A student's submission: files kept from the previous submission plus newly picked ones. */
export interface SubmissionInput {
  keptFileIds: string[];
  newFiles: File[];
}