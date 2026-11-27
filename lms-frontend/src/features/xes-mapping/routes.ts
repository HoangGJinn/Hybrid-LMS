import type { RouteObject } from 'react-router';
import { lazyPage } from '@core/router/lazyPage';
import { crumb } from '@core/router/route-handle';

export const xesMappingRoute: RouteObject = {
  path: 'xes-mapping',
  ...crumb('XES Mapping'),
  ...lazyPage(() => import('./views/XesMappingPage')),
};