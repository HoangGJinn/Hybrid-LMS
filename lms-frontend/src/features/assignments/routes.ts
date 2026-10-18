import type { RouteObject } from 'react-router';
import { lazyPage } from '@core/router/lazyPage';
import { crumb } from '@core/router/route-handle';
import { AssignmentCrumb } from './components/AssignmentCrumb';

/** Standalone page below a course. */
export const assignmentDetailRoute: RouteObject = {
  path: 'assignments/:assignmentId',
  ...crumb(AssignmentCrumb),
  ...lazyPage(() => import('./views/AssignmentDetailPage')),
};

export const studentAssignmentsRoute: RouteObject = {
  path: 'assignments',
  ...crumb('Assignments'),
  ...lazyPage(() => import('./views/AssignmentsPage')),
};
