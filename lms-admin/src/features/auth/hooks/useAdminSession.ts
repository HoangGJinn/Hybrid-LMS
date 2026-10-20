import { useQuery } from '@tanstack/react-query';
import { useAdminAuthStore } from '@/core/store/useAdminAuthStore';
import type { SessionUser } from '@/core/types/auth.types';
import { authService } from '../api/auth.service';
import { authKeys } from '../api/queryKeys';
import { refreshAccessToken } from '../api/refresh-session';

const SESSION_STALE_TIME_MS = 1000 * 60 * 60 * 12; // 12 hours
const SESSION_GC_TIME_MS = 1000 * 60 * 60 * 24; // 24 hours

/**
 * The current session: `SessionUser`, or `null` when signed out.
 * All admin session data is owned strictly by TanStack Query.
 * After a page reload the access token (memory only) is gone, so the session is restored
 * from the httpOnly refresh cookie; without a valid cookie the result is `null`.
 */
export const useAdminSession = () =>
  useQuery<SessionUser | null>({
    queryKey: authKeys.session(),
    queryFn: async () => {
      try {
        if (!useAdminAuthStore.getState().accessToken) {
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
