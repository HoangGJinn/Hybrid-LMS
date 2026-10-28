import type { RouteObject } from 'react-router';
import { lazyPage } from '@/core/router/lazyPage';
import { crumb } from '@/core/router/route-handle';
import { ClassCrumb } from './components/ClassCrumb';

export const coursesRoute: RouteObject = {
  path: 'courses',
  ...crumb('Courses'),
  children: [
    { index: true, ...lazyPage(() => import('./views/CoursesPage')) },
    {
      path: ':classId',
      ...crumb(ClassCrumb),
      children: [
        { index: true, ...lazyPage(() => import('./views/CourseDetailPage')) },
        {
          path: 'participants',
          ...crumb('Participants'),
          ...lazyPage(() => import('./views/ParticipantsPage')),
        },
      ],
    },
  ],
};
