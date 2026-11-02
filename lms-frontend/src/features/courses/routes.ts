import type { RouteObject } from 'react-router';
import { lazyPage } from '@core/router/lazyPage';
import { crumb } from '@core/router/route-handle';
import { CourseCrumb } from './components/CourseCrumb';
import { VideoCrumb } from './components/VideoCrumb';

/** Routes other features plug into a course, so `courses` never has to import them. */
export interface CourseRouteParts {
  /** Tabs rendered inside CourseLayout next to Content (e.g. Grades, Classmates). */
  tabs: RouteObject[];
  /** Standalone pages below a course (document, quiz, assignment, exam). */
  detailPages: RouteObject[];
}

/** Standalone page below a course, shared by the student and lecturer trees. */
const videoRoute: RouteObject = {
  path: 'videos/:itemId',
  ...crumb(VideoCrumb),
  ...lazyPage(() => import('./views/VideoViewerPage')),
};

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
        videoRoute,
        ...detailPages,
      ],
    },
  ],
});

export const createLecturerClassRoutes = ({
  tabs,
  detailPages,
}: CourseRouteParts): RouteObject => ({
  path: 'classes',
  ...crumb('My Classes'),
  children: [
    { index: true, ...lazyPage(() => import('./views/LecturerCoursesPage')) },
    {
      path: ':courseId',
      ...crumb(CourseCrumb),
      children: [
        {
          // Banner + tabs shared by the editor and Members; detail pages below render without them.
          ...lazyPage(() => import('./views/LecturerCourseLayout')),
          children: [
            {
              index: true,
              ...lazyPage(() => import('./views/CourseEditorPage')),
            },
            ...tabs,
          ],
        },
        videoRoute,
        ...detailPages,
      ],
    },
  ],
});