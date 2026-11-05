export type AssignmentStatus =
  'UPCOMING' | 'OPEN' | 'SUBMITTED' | 'GRADED' | 'OVERDUE';

/** FILE: students upload files; TEXT: students write the answer online. */
export type SubmissionType = 'FILE' | 'TEXT';

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  instruction: string;
  openAt: string;
  endAt: string;
  status: AssignmentStatus;
  submissionType: SubmissionType;
  /** Accepted file formats such as `py`, `cpp`, `zip`; empty means any supported format. */
  acceptedExtensions: string[];
  /** The lecturer's note on what to submit and how. */
  submissionNote: string | null;
}

/** A file with a short-lived download link (presigned S3 URL); never store or cache it for long. */
export interface AssignmentFileLink {
  fileId: string;
  fileName: string;
  contentType: string;
  size: number;
  downloadUrl: string;
}

/** One student's submission, as listed for the lecturer and in the student's own grade table. */
export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  submittedBy: string;
  studentName: string;
  studentCode: string;
  score: number | null;
  comment: string | null;
  /** The answer typed online; null for file submissions. */
  answerText: string | null;
  submittedAt: string;
  /** Names only, for lists that do not need the links. */
  fileNames: string[];
  /** Files with short-lived download links. */
  files: AssignmentFileLink[];
}

/** The signed-in student's own submission of an assignment. */
export interface MySubmission {
  id: string;
  /** Time of the latest edit. */
  submittedAt: string;
  score: number | null;
  comment: string | null;
  answerText: string | null;
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
  submissionType: SubmissionType;
  acceptedExtensions: string[];
  submissionNote: string;
  files: File[];
}

/** What a lecturer submits to edit an assignment: the same fields as creation plus the attachments to keep. */
export interface UpdateAssignmentInput extends NewAssignmentInput {
  /** Ids of the existing attachments that stay; the others are removed. `files` holds the new ones. */
  keptFileIds: string[];
}

/**
 * A student's submission. For a file assignment: files kept from the previous submission plus newly picked ones.
 * For an online assignment: the typed answer.
 */
export interface SubmissionInput {
  keptFileIds: string[];
  newFiles: File[];
  answerText?: string;
}