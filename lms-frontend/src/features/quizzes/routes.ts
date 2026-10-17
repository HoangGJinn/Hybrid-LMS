import type { RouteObject } from 'react-router'
import { lazyPage } from '@core/router/lazyPage'
import { crumb } from '@core/router/route-handle'
import { QuizCrumb } from './components/QuizCrumb'

/** Standalone page below a course. */
export const quizRoute: RouteObject = { path: 'quizzes/:quizId', ...crumb(QuizCrumb), ...lazyPage(() => import('./views/QuizPage')) }
