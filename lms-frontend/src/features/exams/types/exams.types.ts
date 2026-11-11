export type ExamSessionStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';

export interface ExamSchedule {
  id: string;
  classId: string;
  examName: string;
  startTime: string;
  endTime: string;
}

export interface ExamSession {
  id: string;
  examScheduleId: string;
  studentId: string;
  status: ExamSessionStatus;
  score: number | null;
  startedAt: string;
  endedAt: string | null;
}

/** MULTIPLE_CHOICE: questions typed into the system; FILE: an uploaded question file. An exam is exactly one of them. */
export type ExamFormat = 'MULTIPLE_CHOICE' | 'FILE';

/** Where an exam is in time: before `startTime`, between `startTime` and `endTime`, or from `endTime` on. */
export type ExamStatus = 'UPCOMING' | 'OPEN' | 'CLOSED';

/** One answer, with whether it is the correct one. Only lecturers ever receive this. */
export interface ExamOption {
  id: string;
  content: string;
  isCorrect: boolean;
}

export interface ExamQuestion {
  id: string;
  content: string;
  orderIndex: number;
  options: ExamOption[];
}

/** A file with a short-lived download link (presigned S3 URL); never store or cache it for long. */
export interface ExamFileLink {
  fileId: string;
  fileName: string;
  contentType: string;
  size: number;
  downloadUrl: string;
}

/** An exam as its lecturer sees it: correct answers and the question file's link included. */
export interface LecturerExam {
  id: string;
  classId: string;
  examName: string;
  /** ISO 8601: when students may start. */
  startTime: string;
  /** ISO 8601: after this nobody can start, and an attempt in progress is cut off. */
  endTime: string;
  /** How long one attempt lasts. */
  durationMinutes: number;
  format: ExamFormat;
  /** Empty for a FILE exam. */
  questions: ExamQuestion[];
  /** The question file of a FILE exam; null for a multiple-choice exam. */
  file: ExamFileLink | null;
  /** Computed by the server at the time of the request. */
  status: ExamStatus;
  /** How many students have started the exam. */
  startedCount: number;
  /** True when questions, answers and the question file can no longer be changed. */
  isContentLocked: boolean;
}

export interface NewExamOption {
  content: string;
  isCorrect: boolean;
}

/** A question to create: its text and 2 to 6 answers, exactly one of them correct. */
export interface NewExamQuestion {
  content: string;
  options: NewExamOption[];
}

/** What a lecturer fills in to create an exam. Only the part that matches `format` is used. */
export interface NewExamInput {
  examName: string;
  /** ISO 8601 */
  startTime: string;
  /** ISO 8601 */
  endTime: string;
  durationMinutes: number;
  format: ExamFormat;
  questions: NewExamQuestion[];
  file: File | null;
}

/** What can still change once the exam is locked: its name and, while not closed, a later closing time or longer duration. */
export interface UpdateExamScheduleInput {
  examName?: string;
  /** ISO 8601 */
  endTime?: string;
  durationMinutes?: number;
}
