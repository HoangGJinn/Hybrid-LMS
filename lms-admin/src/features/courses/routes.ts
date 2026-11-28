import { redirect, type RouteObject } from 'react-router';
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

export const importExportRoute: RouteObject = {
  path: 'import-export',
  ...crumb('Import / Export'),
  ...lazyPage(() => import('./views/ImportExportPage')),
};

/** The page used to be "Import data" at /import; old links and bookmarks still work. */
export const legacyImportRoute: RouteObject = {
  path: 'import',
  loader: () => redirect('/import-export'),
};