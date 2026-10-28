import { create } from 'zustand';

interface AuthState {
  /** Access token. Memory only: it is never written to any browser storage. */
  token: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  setToken: (token: string | null) => void;
  logout: () => void;
}

type AuthStore = AuthState & AuthActions;

/**
 * The refresh token lives in an httpOnly cookie (JS cannot read it);
 * the access token lives strictly in memory (RAM) within this store for Axios request headers.
 * All user profile and session data is owned strictly by TanStack Query (`useCurrentUser`).
 */
export const useAuthStore = create<AuthStore>()((set) => ({
  token: null,
  isAuthenticated: false,

  setToken: (token) => {
    set({
      token: token ?? null,
      isAuthenticated: Boolean(token),
    });
  },

  logout: () => {
    set({ token: null, isAuthenticated: false });
  },
}));
