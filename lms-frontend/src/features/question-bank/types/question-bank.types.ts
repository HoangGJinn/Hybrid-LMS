export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type QuestionSource = 'LECTURER_UPLOAD' | 'AI_GENERATED' | 'MANUAL';
export type ImportBatchStatus =
  'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';

export type ReviewDecision = 'APPROVED' | 'REJECTED';
export type ReviewFilter = 'ALL' | QuestionReviewStatus;
export type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export interface BankQuestionOption {
  id: string;
  optionLabel: string;
  optionText: string;
  isCorrect: boolean;
}

export interface BankQuestionKc {
  kcId: string;
  name: string;
}

/** A question in the bank, as returned by GET /api/questions. */
export interface BankQuestion {
  id: string;
  subjectId: string;
  source: QuestionSource;
  importBatchId: string | null;
  questionText: string;
  difficulty: QuestionDifficulty;
  explanation: string | null;
  reviewStatus: QuestionReviewStatus;
  reviewedBy: string | null;
  isActive: boolean;
  createdAt: string;
  options: BankQuestionOption[];
  knowledgeComponents: BankQuestionKc[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SubjectOption {
  id: string;
  subjectCode: string;
  name: string;
}

export interface QuestionListParams {
  subjectId: string;
  reviewStatus?: QuestionReviewStatus;
  isActive?: boolean;
  importBatchId?: string;
  page: number;
  limit: number;
}

/** `row` is the Excel row number: 1 is the header, 0 means the whole file. */
export interface ImportRowError {
  row: number;
  field?: string;
  message: string;
}

export interface ImportBatch {
  id: string;
  subjectId: string;
  uploadedBy: string;
  fileId: string;
  /** Not returned by the backend yet; the UI falls back to a generic label. */
  fileName?: string | null;
  status: ImportBatchStatus;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errorReport: ImportRowError[] | null;
  createdAt: string;
}