import type { RouteObject } from 'react-router'
import { lazyPage } from '@core/router/lazyPage'
import { crumb } from '@core/router/route-handle'

export const calendarRoute: RouteObject = { path: 'calendar', ...crumb('Calendar'), ...lazyPage(() => import('./views/CalendarPage')) }
