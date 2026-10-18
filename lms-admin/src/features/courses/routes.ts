import type { RouteObject } from 'react-router';
import { lazyPage } from '@/core/router/lazyPage';
import { crumb } from '@/core/router/route-handle';

export const coursesRoute: RouteObject = {
  path: 'courses',
  ...crumb('Courses'),
  ...lazyPage(() => import('./views/CoursesPage')),
};
