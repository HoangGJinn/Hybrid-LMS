import { create } from 'zustand';

interface AdminAuthState {
  /** Access token. Memory only: never written to any browser storage. */
  accessToken: string | null;
  isAuthenticated: boolean;
}

interface AdminAuthActions {
  setAccessToken: (accessToken: string | null) => void;
  logout: () => void;
}

export const useAdminAuthStore = create<AdminAuthState & AdminAuthActions>()(
  (set) => ({
    accessToken: null,
    isAuthenticated: false,
    setAccessToken: (accessToken) =>
      set({ accessToken, isAuthenticated: Boolean(accessToken) }),
    logout: () => set({ accessToken: null, isAuthenticated: false }),
  }),
);
