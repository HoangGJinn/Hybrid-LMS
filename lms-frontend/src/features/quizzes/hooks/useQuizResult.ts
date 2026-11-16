import { useQuery } from '@tanstack/react-query';
import { quizService } from '../api/quiz.service';
import { quizKeys } from '../api/queryKeys';

/** Normally already in the cache from the submit call; fetched when the page is reloaded. */
export const useQuizResult = (quizId: string) =>
  useQuery({
    queryKey: quizKeys.result(quizId),
    queryFn: () => quizService.getResult(quizId),
    enabled: quizId !== '',
  });