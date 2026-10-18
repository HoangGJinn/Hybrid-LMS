import type { RouteObject } from 'react-router';
import { lazyPage } from '@core/router/lazyPage';
import { crumb } from '@core/router/route-handle';

export const aiGeneratorRoute: RouteObject = {
  path: 'ai-generator',
  ...crumb('AI Assessment'),
  ...lazyPage(() => import('./views/AiGeneratorPage')),
};
