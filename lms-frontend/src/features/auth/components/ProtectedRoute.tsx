import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import FullPageLoader from '@shared/components/FullPageLoader';
import { useCurrentUser } from '../hooks/useCurrentUser';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { data: user, isPending } = useCurrentUser();

  if (isPending) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
