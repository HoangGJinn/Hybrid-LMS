import type { RouteObject } from 'react-router';
import { lazyPage } from '@/core/router/lazyPage';
import { crumb } from '@/core/router/route-handle';

export const monitoringRoute: RouteObject = {
  path: 'monitoring',
  ...crumb('Monitoring'),
  ...lazyPage(() => import('./views/MonitoringPage')),
};
