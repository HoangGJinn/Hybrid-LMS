import type { RouteObject } from 'react-router';
import { lazyPage } from '@core/router/lazyPage';
import { crumb } from '@core/router/route-handle';

export const masteryRoute: RouteObject = {
  path: 'mastery',
  ...crumb('Knowledge Mastery'),
  ...lazyPage(() => import('./views/MasteryPage')),
};
