import type { RouteObject } from 'react-router'
import { lazyPage } from '@core/router/lazyPage'
import { crumb } from '@core/router/route-handle'

/** Tab of a course (rendered inside the courses feature's CourseLayout). */
export const courseGradesTabRoute: RouteObject = { path: 'grades', ...crumb('Grades'), ...lazyPage(() => import('./views/CourseGradesPage')) }

export const gradingDeskRoute: RouteObject = { path: 'grading', ...crumb('Grading Desk'), ...lazyPage(() => import('./views/GradingDeskPage')) }
