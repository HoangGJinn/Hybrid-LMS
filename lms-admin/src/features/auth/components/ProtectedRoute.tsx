import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import FullPageLoader from '@/shared/components/FullPageLoader';
import { useAdminSession } from '../hooks/useAdminSession';
import ForbiddenPage from '../views/ForbiddenPage';

/** Lets only signed-in administrators through: guests go to /login, other roles see a 403 page. */
export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { data: user, isLoading } = useAdminSession();

  if (isLoading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <ForbiddenPage />;

  return <>{children}</>;
};
