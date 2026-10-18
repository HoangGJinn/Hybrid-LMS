import type { AuthUser } from '@core/types/auth.types';
import { get, post } from '@core/api/http';

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

const MISSING_TOKEN_MESSAGE = 'Sign-in failed: no token received.';

export const authService = {
  loginWithGoogle: async (idToken: string): Promise<AuthSession> => {
    const session = await post<AuthSession>('/api/auth/google', { idToken });
    if (!session.accessToken) throw new Error(MISSING_TOKEN_MESSAGE);
    return session;
  },
  getMe: (): Promise<AuthUser> => get<AuthUser>('/api/auth/me'),
  logout: (): Promise<void> => post<void>('/api/auth/logout'),
};
