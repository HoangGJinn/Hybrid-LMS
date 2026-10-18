import type { RouteObject } from 'react-router';
import { lazyPage } from '@core/router/lazyPage';
import { crumb } from '@core/router/route-handle';
import { CourseCrumb } from './components/CourseCrumb';

/** Routes other features plug into a course, so `courses` never has to import them. */
export interface CourseRouteParts {
  /** Tabs rendered inside CourseLayout next to Content (e.g. Grades, Classmates). */
  tabs: RouteObject[];
  /** Standalone pages below `/student/courses/:courseId` (document, quiz, assignment, exam). */
  detailPages: RouteObject[];
}

export const createStudentCourseRoutes = ({
  tabs,
  detailPages,
}: CourseRouteParts): RouteObject => ({
  path: 'courses',
  ...crumb('My Courses'),
  children: [
    { index: true, ...lazyPage(() => import('./views/StudentCoursesPage')) },
    {
      path: ':courseId',
      ...crumb(CourseCrumb),
      children: [
        {
          // Banner + tabs shared by Content / Grades / Classmates.
          ...lazyPage(() => import('./views/CourseLayout')),
          children: [
            {
              index: true,
              ...lazyPage(() => import('./views/CourseContentPage')),
            },
            ...tabs,
          ],
        },
        ...detailPages,
      ],
    },
  ],
});

export const lecturerClassRoutes: RouteObject = {
  path: 'classes',
  ...crumb('My Classes'),
  children: [
    { index: true, ...lazyPage(() => import('./views/LecturerCoursesPage')) },
    {
      path: ':courseId',
      ...crumb(CourseCrumb),
      ...lazyPage(() => import('./views/CourseEditorPage')),
    },
  ],
};
