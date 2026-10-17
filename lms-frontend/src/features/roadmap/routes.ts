import type { RouteObject } from 'react-router'
import { lazyPage } from '@core/router/lazyPage'
import { crumb } from '@core/router/route-handle'

export const roadmapRoute: RouteObject = { path: 'roadmap', ...crumb('Learning Roadmap'), ...lazyPage(() => import('./views/RoadmapPage')) }
