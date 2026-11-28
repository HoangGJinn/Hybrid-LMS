import type { QuestionListParams } from '../types/question-bank.types';

export const questionBankKeys = {
  all: ['question-bank'] as const,
  subjects: ['question-bank', 'subjects'] as const,
  /** Prefix of every question list query, used to patch or invalidate all of them. */
  lists: ['question-bank', 'questions'] as const,
  list: (params: QuestionListParams) =>
    ['question-bank', 'questions', params] as const,
  counts: (subjectId: string, kind: 'total' | 'pending' | 'inactive') =>
    ['question-bank', 'counts', subjectId, kind] as const,
  batches: (subjectId: string) =>
    ['question-bank', 'batches', subjectId] as const,
};