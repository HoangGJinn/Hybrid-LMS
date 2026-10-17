import type { RouteObject } from 'react-router'
import { lazyPage } from '@core/router/lazyPage'
import { crumb } from '@core/router/route-handle'

export const analyticsRoute: RouteObject = { path: 'analytics', ...crumb('Analytics'), ...lazyPage(() => import('./views/ClassAnalyticsPage')) }
