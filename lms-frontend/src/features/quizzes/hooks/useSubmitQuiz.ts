import { useMutation, useQueryClient } from '@tanstack/react-query';
import { masteryKeys } from '@features/mastery';
import { roadmapKeys } from '@features/roadmap';
import { quizService } from '../api/quiz.service';
import { quizKeys } from '../api/queryKeys';

/** Submits the quiz, stores the result in the cache and refreshes what a quiz result changes. */
export const useSubmitQuiz = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quizId: string) => quizService.submit(quizId),
    onSuccess: (result) => {
      queryClient.setQueryData(quizKeys.result(result.quiz.id), result);
      // The quiz flips to SUBMITTED here, which makes the page switch to the result view.
      queryClient.setQueryData(quizKeys.detail(result.quiz.id), result.quiz);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: quizKeys.mine }),
        queryClient.invalidateQueries({ queryKey: [...quizKeys.all, 'practice'] }),
        queryClient.invalidateQueries({ queryKey: masteryKeys.all }),
        queryClient.invalidateQueries({ queryKey: roadmapKeys.all }),
      ]);
    },
  });
};