import { useQuery } from '@tanstack/react-query';
import { authService } from '../api/auth.service';
import { refreshAccessToken } from '../api/refresh-session';
import { authKeys } from '../api/queryKeys';
import { useAuthStore } from '@core/store/useAuthStore';
import type { AuthUser } from '@core/types/auth.types';

export const useCurrentUser = () => {
  return useQuery<AuthUser | null>({
    queryKey: authKeys.me(),
    queryFn: async (): Promise<AuthUser | null> => {
      try {
        const { token, profile } = useAuthStore.getState();
        // If neither token nor persisted profile exists, the user is logged out or never signed in.
        if (!token && !profile) {
          return null;
        }
        // After a page reload the access token (memory only) is gone: restore the session from the refresh cookie.
        if (!token) {
          await refreshAccessToken();
          return useAuthStore.getState().user;
        }
        return (await authService.getMe()) ?? null;
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
};
