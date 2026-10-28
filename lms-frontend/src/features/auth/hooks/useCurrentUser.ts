import { useQuery } from '@tanstack/react-query';
import { authService } from '../api/auth.service';
import { refreshAccessToken } from '../api/refresh-session';
import { authKeys } from '../api/queryKeys';
import { useAuthStore } from '@core/store/useAuthStore';
import type { AuthUser } from '@core/types/auth.types';

const SESSION_STALE_TIME_MS = 1000 * 60 * 60 * 1; // 1 hours
const SESSION_GC_TIME_MS = 1000 * 60 * 60 * 2; // 2 hours

/**
 * Returns the currently signed-in user from the server.
 * All user profile and role data is owned strictly by TanStack Query.
 */
export const useCurrentUser = () => {
  return useQuery<AuthUser | null>({
    queryKey: authKeys.me(),
    queryFn: async (): Promise<AuthUser | null> => {
      try {
        const { token } = useAuthStore.getState();
        // After a page reload the access token (memory only) is gone: restore the session from the refresh cookie.
        if (!token) {
          await refreshAccessToken();
        }
        return (await authService.getMe()) ?? null;
      } catch {
        return null;
      }
    },
    staleTime: SESSION_STALE_TIME_MS,
    gcTime: SESSION_GC_TIME_MS,
    retry: false,
  });
};
