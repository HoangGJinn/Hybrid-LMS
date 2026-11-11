import type { RouteObject } from 'react-router';
import { lazyPage } from '@core/router/lazyPage';
import { crumb } from '@core/router/route-handle';
import { ExamCrumb } from './components/ExamCrumb';
import { LecturerExamCrumb } from './components/LecturerExamCrumb';

/** Standalone page below a course. */
export const examRoomRoute: RouteObject = {
  path: 'exams/:examId',
  ...crumb(ExamCrumb),
  ...lazyPage(() => import('./views/ExamRoomPage')),
};

/** Standalone page below a lecturer's class. */
export const lecturerExamRoute: RouteObject = {
  path: 'exams/:examId',
  ...crumb(LecturerExamCrumb),
  ...lazyPage(() => import('./views/LecturerExamPage')),
};

export const studentExamsRoute: RouteObject = {
  path: 'exams',
  ...crumb('Exams'),
  ...lazyPage(() => import('./views/ExamsPage')),
};
