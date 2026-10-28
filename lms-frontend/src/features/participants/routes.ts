import type { RouteObject } from 'react-router';
import { lazyPage } from '@core/router/lazyPage';
import { crumb } from '@core/router/route-handle';

/** Tab of a course (rendered inside the courses feature's CourseLayout). */
export const classmatesTabRoute: RouteObject = {
  path: 'classmates',
  ...crumb('Classmates'),
  ...lazyPage(() => import('./views/ClassmatesPage')),
};

export const studentRosterRoute: RouteObject = {
  path: 'students',
  ...crumb('Students'),
  ...lazyPage(() => import('./views/StudentRosterPage')),
};

export const lecturerMembersTabRoute: RouteObject = {
  path: 'members',
  ...crumb('Members'),
  ...lazyPage(() => import('./views/CourseMembersPage')),
};