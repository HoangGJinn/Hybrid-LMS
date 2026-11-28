import type { RouteObject } from 'react-router';
import { lazyPage } from '@core/router/lazyPage';
import { crumb } from '@core/router/route-handle';

export const questionBankRoute: RouteObject = {
  path: 'question-bank',
  ...crumb('Question Bank'),
  ...lazyPage(() => import('./views/QuestionBankPage')),
};