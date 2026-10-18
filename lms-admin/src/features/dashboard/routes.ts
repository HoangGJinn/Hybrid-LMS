import type { RouteObject } from 'react-router';
import { lazyPage } from '@/core/router/lazyPage';
import { crumb } from '@/core/router/route-handle';

export const dashboardRoute: RouteObject = {
  index: true,
  ...crumb('Dashboard'),
  ...lazyPage(() => import('./views/DashboardPage')),
};
