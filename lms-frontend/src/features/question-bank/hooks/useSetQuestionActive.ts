import { useMutation, useQueryClient } from '@tanstack/react-query';
import { questionBankService } from '../api/question-bank.service';
import { questionBankKeys } from '../api/queryKeys';
import type { BankQuestion, Paged } from '../types/question-bank.types';

interface SetActiveInput {
  id: string;
  isActive: boolean;
}

type Lists = Paged<BankQuestion>;

/** Turns a question on or off for quizzes. The switch flips immediately and rolls back if the request fails. */
export const useSetQuestionActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: SetActiveInput) =>
      questionBankService.setActive(id, isActive),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: questionBankKeys.lists });
      const previous = queryClient.getQueriesData<Lists>({
        queryKey: questionBankKeys.lists,
      });
      queryClient.setQueriesData<Lists>(
        { queryKey: questionBankKeys.lists },
        (old) =>
          old && {
            ...old,
            items: old.items.map((q) =>
              q.id === id ? { ...q, isActive } : q,
            ),
          },
      );
      return { previous };
    },
    onError: (_error, _input, context) =>
      context?.previous.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: questionBankKeys.all }),
  });
};