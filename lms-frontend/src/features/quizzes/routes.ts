import type { RouteObject } from 'react-router';
import { lazyPage } from '@core/router/lazyPage';
import { crumb } from '@core/router/route-handle';
import { PracticeCrumb } from './components/PracticeCrumb';
import { QuizCrumb } from './components/QuizCrumb';

/** Standalone page below a course. */
export const quizRoute: RouteObject = {
  path: 'quizzes/:quizId',
  ...crumb(QuizCrumb),
  ...lazyPage(() => import('./views/QuizPage')),
};

/** Choose the size and focus of a practice quiz for one document. */
export const practiceRoute: RouteObject = {
  path: 'documents/:docId/practice',
  ...crumb(PracticeCrumb),
  ...lazyPage(() => import('./views/PracticeSetupPage')),
};