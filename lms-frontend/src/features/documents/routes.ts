import type { RouteObject } from 'react-router';
import { lazyPage } from '@core/router/lazyPage';
import { crumb } from '@core/router/route-handle';
import { DocumentCrumb } from './components/DocumentCrumb';

/** Standalone page below a course. */
export const documentRoute: RouteObject = {
  path: 'documents/:docId',
  ...crumb(DocumentCrumb),
  ...lazyPage(() => import('./views/DocumentViewerPage')),
};
