import { useQuery } from '@tanstack/react-query';
import { quizService } from '../api/quiz.service';
import { quizKeys } from '../api/queryKeys';

// `?? null` because TanStack Query v5 does not accept `undefined` as query data.
export const useQuiz = (id: string) =>
  useQuery({
    queryKey: quizKeys.detail(id),
    queryFn: async () => (await quizService.getQuiz(id)) ?? null,
    enabled: id !== '',
  });
