import type { RouteObject } from 'react-router';
import { lazyPage } from '@core/router/lazyPage';
import { crumb } from '@core/router/route-handle';

export const notificationsRoute: RouteObject = {
  path: 'notifications',
  ...crumb('Notifications'),
  ...lazyPage(() => import('./views/NotificationsPage')),
};
