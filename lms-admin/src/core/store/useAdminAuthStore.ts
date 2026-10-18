import { create } from 'zustand';
import type { SessionUser } from '@/core/types/auth.types';

interface AdminAuthState {
  /** Signed-in user. Memory only. */
  user: SessionUser | null;
  /** Access token. Memory only: never written to any browser storage. */
  accessToken: string | null;
  isAuthenticated: boolean;
}

interface AdminAuthActions {
  login: (user: SessionUser, accessToken: string) => void;
  logout: () => void;
}

// The refresh token lives in an httpOnly cookie (JS cannot read it). After a reload the session is
// restored by calling POST /api/auth/refresh (see features/auth/hooks/useAdminSession.ts).
export const useAdminAuthStore = create<AdminAuthState & AdminAuthActions>()(
  (set) => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    login: (user, accessToken) =>
      set({ user, accessToken, isAuthenticated: true }),
    logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  }),
);
