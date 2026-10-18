import type { RouteObject } from 'react-router';
import { lazyPage } from '@/core/router/lazyPage';

export const loginRoute: RouteObject = {
  path: '/login',
  ...lazyPage(() => import('./views/LoginPage')),
};
