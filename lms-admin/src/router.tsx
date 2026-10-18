import { createBrowserRouter } from 'react-router';
import AdminShell from '@/core/layouts/AdminShell';
import { lazyPage } from '@/core/router/lazyPage';
import { ProtectedRoute } from '@/features/auth';
import { loginRoute } from '@/features/auth/routes';
import { coursesRoute } from '@/features/courses/routes';
import { dashboardRoute } from '@/features/dashboard/routes';
import FullPageLoader from '@/shared/components/FullPageLoader';
import RouteErrorPage from '@/shared/components/RouteErrorPage';

// Each feature owns its routes (features/<name>/routes.ts). This file only assembles them.
export const router = createBrowserRouter([
  {
    HydrateFallback: FullPageLoader,
    ErrorBoundary: RouteErrorPage,
    children: [
      loginRoute,
      {
        element: (
          <ProtectedRoute>
            <AdminShell />
          </ProtectedRoute>
        ),
        children: [
          {
            // Errors inside a page render here, so the sidebar and top bar stay usable.
            ErrorBoundary: RouteErrorPage,
            children: [
              dashboardRoute,
              coursesRoute,
              {
                path: '*',
                ...lazyPage(() => import('@/core/views/NotFoundPage')),
              },
            ],
          },
        ],
      },
    ],
  },
]);
