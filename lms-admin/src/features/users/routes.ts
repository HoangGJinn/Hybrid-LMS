import type { RouteObject } from 'react-router';
import { lazyPage } from '@/core/router/lazyPage';
import { crumb } from '@/core/router/route-handle';

export const lecturersRoute: RouteObject = {
  path: 'lecturers',
  ...crumb('Lecturers'),
  ...lazyPage(() => import('./views/LecturersPage')),
};

export const studentsRoute: RouteObject = {
  path: 'students',
  ...crumb('Students'),
  ...lazyPage(() => import('./views/StudentsPage')),
};
