import { useMutation, useQueryClient } from '@tanstack/react-query';
import { masteryKeys } from '@features/mastery';
import { roadmapKeys } from '@features/roadmap';
import { quizService } from '../api/quiz.service';
import type { QuizAnswer } from '../types/quizzes.types';
import { quizKeys } from '../api/queryKeys';

interface SubmitQuizInput {
  quizId: string;
  answers: QuizAnswer[];
}

/** Submits the answers, stores the graded quiz in the cache and refreshes what a quiz result changes. */
export const useSubmitQuiz = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, answers }: SubmitQuizInput) =>
      quizService.submit(quizId, answers),
    onSuccess: (gradedQuiz) => {
      queryClient.setQueryData(quizKeys.detail(gradedQuiz.id), gradedQuiz);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: quizKeys.mine }),
        queryClient.invalidateQueries({ queryKey: masteryKeys.all }),
        queryClient.invalidateQueries({ queryKey: roadmapKeys.all }),
      ]);
    },
  });
};
