import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quizService } from '../api/quiz.service';
import { quizKeys } from '../api/queryKeys';
import type { CreateQuizInput } from '../types/quizzes.types';

export const useCreateQuiz = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuizInput) => quizService.create(input),
    onSuccess: (quiz) => {
      queryClient.setQueryData(quizKeys.detail(quiz.id), quiz);
      return queryClient.invalidateQueries({ queryKey: quizKeys.mine });
    },
  });
};