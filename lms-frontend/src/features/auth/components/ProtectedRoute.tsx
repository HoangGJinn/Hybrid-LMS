import { useEffect } from 'react';
import { Navigate } from 'react-router';
import FullPageLoader from '@shared/components/FullPageLoader';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useAuthStore } from '@core/store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { data: user, isPending } = useCurrentUser();
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    if (user !== undefined) {
      setUser(user);
    }
  }, [user, setUser]);

  if (isPending) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
