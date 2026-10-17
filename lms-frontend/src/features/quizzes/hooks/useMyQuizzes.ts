import { useQuery } from '@tanstack/react-query'
import { quizService } from '../api/quiz.service'
import { quizKeys } from '../api/queryKeys'

/** Quizzes generated for the signed-in student. */
export const useMyQuizzes = () =>
  useQuery({ queryKey: quizKeys.mine, queryFn: () => quizService.getMyQuizzes() })
