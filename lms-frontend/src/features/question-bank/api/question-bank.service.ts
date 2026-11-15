import { get, patch, post } from '@core/api/http';
import type {
  BankQuestion,
  ImportBatch,
  Paged,
  QuestionListParams,
  ReviewDecision,
  SubjectOption,
} from '../types/question-bank.types';

/** Drops empty values and turns the rest into strings, because they travel in the query string. */
const toQuery = (
  params: Record<string, string | number | boolean | undefined>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)]),
  );

export const questionBankService = {
  getSubjects: (): Promise<SubjectOption[]> => get('/api/subjects'),

  listQuestions: (params: QuestionListParams): Promise<Paged<BankQuestion>> =>
    get('/api/questions', toQuery({ ...params })),

  review: (id: string, reviewStatus: ReviewDecision): Promise<BankQuestion> =>
    patch(`/api/questions/${id}/review`, { reviewStatus }),

  setActive: (id: string, isActive: boolean): Promise<BankQuestion> =>
    patch(`/api/questions/${id}/active`, { isActive }),

  listBatches: (subjectId: string): Promise<ImportBatch[]> =>
    get('/api/question-import-batches', { subjectId }),

  importQuestions: (subjectId: string, fileId: string): Promise<ImportBatch> =>
    post('/api/question-import-batches', { subjectId, fileId }),
};