import { useAuthStore } from '../store/useAuthStore';

/** Id of the signed-in user (student or lecturer), or `null` until the session is available. */
export const useCurrentUserId = (): string | null =>
  useAuthStore((state) => state.user?.id ?? null);
