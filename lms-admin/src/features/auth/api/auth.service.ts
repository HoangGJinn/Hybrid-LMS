import { get, post } from '@/core/api/http';
import type { SessionUser } from '@/core/types/auth.types';

export interface AuthSession {
  accessToken: string;
  user: SessionUser;
}

const MISSING_TOKEN_MESSAGE = 'Sign-in failed: no token received.';

export const authService = {
  loginWithGoogle: async (idToken: string): Promise<AuthSession> => {
    const session = await post<AuthSession>('/api/auth/google', { idToken });
    if (!session.accessToken) throw new Error(MISSING_TOKEN_MESSAGE);
    return session;
  },
  getMe: (): Promise<SessionUser> => get<SessionUser>('/api/auth/me'),
  logout: (): Promise<void> => post<void>('/api/auth/logout'),
};

/** Thrown when a valid Google account signs in but is not an administrator. */
export class NotAdminError extends Error {
  constructor() {
    super('This account does not have administrator access.');
    this.name = 'NotAdminError';
  }
}
