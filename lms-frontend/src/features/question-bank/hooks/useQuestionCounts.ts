import { useQueries } from '@tanstack/react-query';
import { questionBankService } from '../api/question-bank.service';
import { questionBankKeys } from '../api/queryKeys';

/**
 * Totals shown above the list. The list endpoint already returns `total`,
 * so each count is a one-row query instead of a separate endpoint.
 */
export const useQuestionCounts = (subjectId: string) => {
  const enabled = subjectId !== '';
  const base = { subjectId, page: 1, limit: 1 };
  const [total, pending, inactive] = useQueries({
    queries: [
      {
        queryKey: questionBankKeys.counts(subjectId, 'total'),
        queryFn: () => questionBankService.listQuestions(base),
        enabled,
      },
      {
        queryKey: questionBankKeys.counts(subjectId, 'pending'),
        queryFn: () =>
          questionBankService.listQuestions({
            ...base,
            reviewStatus: 'PENDING_REVIEW',
          }),
        enabled,
      },
      {
        queryKey: questionBankKeys.counts(subjectId, 'inactive'),
        queryFn: () =>
          questionBankService.listQuestions({ ...base, isActive: false }),
        enabled,
      },
    ],
  });
  return {
    total: total.data?.total,
    pending: pending.data?.total,
    inactive: inactive.data?.total,
  };
};