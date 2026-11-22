import { isAxiosError } from 'axios';
import { get, post } from '@/core/api/http';
import type { SessionUser } from '@/core/types/auth.types';

export interface AuthSession {
  accessToken: string;
  user: SessionUser;
}

const MISSING_TOKEN_MESSAGE = 'Sign-in failed: no token received.';
const FORBIDDEN_STATUS = 403;

const postAdminLogin = async (
  url: string,
  body: unknown,
): Promise<AuthSession> => {
  try {
    const session = await post<AuthSession>(url, body);
    if (!session.accessToken) throw new Error(MISSING_TOKEN_MESSAGE);
    if (session.user.role !== 'ADMIN') throw new NotAdminError();
    return session;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === FORBIDDEN_STATUS) {
      throw new NotAdminError();
    }
    throw error;
  }
};

export const authService = {
  login: (username: string, password: string): Promise<AuthSession> =>
    postAdminLogin('/api/auth/login', { username, password }),
  loginWithGoogle: (idToken: string): Promise<AuthSession> =>
    postAdminLogin('/api/auth/google', { idToken }),
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
