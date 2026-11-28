import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quizService } from '../api/quiz.service';
import { quizKeys } from '../api/queryKeys';
import type { AnswerInput, Quiz } from '../types/quizzes.types';

/** Saves one answer and writes the feedback into the quiz in the cache, so the page updates by itself. */
export const useAnswerQuestion = (quizId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AnswerInput) => quizService.answer(quizId, input),
    onSuccess: (feedback, input) => {
      queryClient.setQueryData<Quiz>(quizKeys.detail(quizId), (quiz) => {
        if (!quiz) return quiz;
        const questions = quiz.questions.map((q) =>
          q.id === input.quizInstanceQuestionId ? { ...q, answer: feedback } : q,
        );
        return {
          ...quiz,
          questions,
          answeredCount: questions.filter((q) => q.answer !== null).length,
        };
      });
    },
  });
};