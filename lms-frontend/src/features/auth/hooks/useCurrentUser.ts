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
        // After a page reload the access token (memory only) is gone: restore the session from the refresh cookie.
        if (!useAuthStore.getState().token) {
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
