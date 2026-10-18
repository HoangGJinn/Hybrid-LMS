import type { CrumbProps } from '@core/router/route-handle';
import { useQuiz } from '../hooks/useQuiz';

/** Breadcrumb label for a route with `:quizId`. */
export const QuizCrumb = ({ params }: CrumbProps) => (
  <>{useQuiz(params.quizId ?? '').data?.title ?? 'Quiz'}</>
);
