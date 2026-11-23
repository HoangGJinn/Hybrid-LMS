import type { RouteObject } from 'react-router';
import { lazyPage } from '@/core/router/lazyPage';
import { crumb } from '@/core/router/route-handle';

export const auditLogsRoute: RouteObject = {
  path: 'audit-logs',
  ...crumb('Audit Log'),
  ...lazyPage(() => import('./views/AuditLogsPage')),
};
