import type { RouteObject } from 'react-router'
import { lazyPage } from '@core/router/lazyPage'

export const studentDashboardRoute: RouteObject = { index: true, ...lazyPage(() => import('./views/StudentDashboard')) }

export const lecturerDashboardRoute: RouteObject = { index: true, ...lazyPage(() => import('./views/LecturerDashboard')) }
