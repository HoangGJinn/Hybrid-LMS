import { useMutation, useQueryClient } from '@tanstack/react-query';
import { questionBankService } from '../api/question-bank.service';
import { questionBankKeys } from '../api/queryKeys';
import type { ReviewDecision } from '../types/question-bank.types';

interface ReviewInput {
  id: string;
  reviewStatus: ReviewDecision;
}

/** Approves or rejects a question, then refreshes the lists and the pending count. */
export const useReviewQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewStatus }: ReviewInput) =>
      questionBankService.review(id, reviewStatus),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: questionBankKeys.all }),
  });
};