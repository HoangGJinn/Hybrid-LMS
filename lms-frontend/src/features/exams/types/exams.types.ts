export type ExamSessionStatus =
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'UNDER_REVIEW';

export interface ExamSchedule {
  id: string;
  classId: string;
  examName: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  format?: ExamFormat;
  status?: ExamStatus;
  maxAttempts?: number | null;
  showResults?: boolean;
  attemptsUsed?: number;
  inProgressSessionId?: string | null;
  bestScore?: number | null;
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

/** One answer, with whether it is the correct one. Only lecturers (or students reviewing when `showResults` is true) receive this. */
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
  /** Null means unlimited attempts; otherwise the maximum number of attempts per student. */
  maxAttempts: number | null;
  /** Whether students can see their score and review correct answers after submitting. */
  showResults: boolean;
  /** Whether question order is shuffled per attempt. */
  shuffleQuestions: boolean;
  /** Whether option order within each question is shuffled per attempt. */
  shuffleOptions: boolean;
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
  maxAttempts?: number | null;
  showResults?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  questions: NewExamQuestion[];
  file: File | null;
}

/** What can still change once the exam is locked: its name, `showResults`, and (while not closed) a later closing time, longer duration, or more attempts. */
export interface UpdateExamScheduleInput {
  examName?: string;
  /** ISO 8601 */
  endTime?: string;
  durationMinutes?: number;
  maxAttempts?: number | null;
  showResults?: boolean;
}

/** One option shown to a student taking an exam (never includes `isCorrect`). */
export interface StudentExamOption {
  id: string;
  content: string;
}

/** One question shown to a student taking an exam. */
export interface StudentExamQuestion {
  id: string;
  content: string;
  orderIndex: number;
  options: StudentExamOption[];
}

/** One attempt row in the student's attempt history for an exam. */
export interface StudentExamAttemptItem {
  id: string;
  attemptNumber: number;
  status: ExamSessionStatus;
  startedAt: string;
  endedAt: string | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
  comment?: string | null;
  score: number | null;
}

/** Item in `GET /api/exams/me`. */
export interface StudentExamSummary {
  id: string;
  classId: string;
  examName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  format: ExamFormat;
  status: ExamStatus;
  maxAttempts: number | null;
  showResults: boolean;
  attemptsUsed: number;
  inProgressSessionId: string | null;
  bestScore: number | null;
}

/** Student lobby overview in `GET /api/classes/:classId/exams/:examId/student`. */
export interface StudentExamLobby {
  id: string;
  classId: string;
  examName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  format: ExamFormat;
  status: ExamStatus;
  questionCount: number;
  maxAttempts: number | null;
  showResults: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  attemptsUsed: number;
  bestScore: number | null;
  canStartNewAttempt: boolean;
  activeSessionId: string | null;
  attempts: StudentExamAttemptItem[];
  serverNow: string;
}

/** Active attempt returned by `POST /api/classes/:classId/exams/:examId/sessions`. */
export interface ExamAttempt {
  session: {
    id: string;
    examScheduleId: string;
    attemptNumber: number;
    status: ExamSessionStatus;
    startedAt: string;
    endedAt: string | null;
    submittedAt?: string | null;
  };
  exam: {
    id: string;
    classId: string;
    examName: string;
    format?: ExamFormat;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    maxAttempts: number | null;
    showResults: boolean;
  };
  deadline: string;
  serverNow: string;
  questions: StudentExamQuestion[];
  savedAnswers: Record<string, string>;
  questionFile?: ExamFileLink | null;
  submittedFiles?: ExamFileLink[];
}

export interface ExamAnswerInput {
  questionId: string;
  optionId: string | null;
}

export interface SaveExamAnswersResult {
  savedQuestionIds: string[];
  savedAt: string;
  deadline: string;
  serverNow: string;
}

export interface SaveFileSubmissionResult {
  sessionId: string;
  submittedAt: string;
  submittedFiles: ExamFileLink[];
  deadline: string;
  serverNow: string;
}

export interface SubmitExamResult {
  sessionId: string;
  examId: string;
  classId: string;
  attemptNumber: number;
  status: ExamSessionStatus;
  startedAt: string;
  endedAt: string;
  showResults: boolean;
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
}

export interface ExamReviewQuestion {
  id: string;
  content: string;
  selectedOptionId: string | null;
  options: ExamOption[];
}

export interface ExamAttemptReview {
  sessionId: string;
  examId: string;
  classId: string;
  examName: string;
  format?: ExamFormat;
  attemptNumber: number;
  startedAt: string;
  endedAt: string | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
  comment?: string | null;
  score: number | null;
  correctCount: number;
  totalQuestions: number;
  questions: ExamReviewQuestion[];
  questionFile?: ExamFileLink | null;
  submittedFiles?: ExamFileLink[];
}

export type StudentExamResultStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'GRADED';

export interface LecturerExamAttemptItem {
  sessionId: string;
  attemptNumber: number;
  status: ExamSessionStatus;
  startedAt: string;
  endedAt: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  score: number | null;
  comment: string | null;
  correctCount: number | null;
  totalQuestions: number;
  submittedFiles: ExamFileLink[];
}

export interface LecturerStudentExamResult {
  studentId: string;
  studentCode: string;
  fullName: string;
  email: string;
  status: StudentExamResultStatus;
  attemptsUsed: number;
  bestScore: number | null;
  latestSessionId: string | null;
  latestSubmittedAt: string | null;
  gradedAt: string | null;
  comment: string | null;
  attempts: LecturerExamAttemptItem[];
}

export interface LecturerExamResultsSummary {
  totalStudents: number;
  startedCount: number;
  submittedCount: number;
  gradedCount: number;
  averageScore: number | null;
  maxScore: number | null;
  minScore: number | null;
}

export interface LecturerExamResults {
  examId: string;
  classId: string;
  examName: string;
  format: ExamFormat;
  maxAttempts: number | null;
  summary: LecturerExamResultsSummary;
  students: LecturerStudentExamResult[];
}

export interface GradeExamSessionInput {
  score: number;
  comment?: string | null;
}

