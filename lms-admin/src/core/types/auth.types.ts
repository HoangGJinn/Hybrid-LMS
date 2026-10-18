export type UserRole = 'STUDENT' | 'LECTURER' | 'ADMIN';

/**
 * Backend `SessionUser` (login / refresh / me).
 * Declared locally for now; move it to `@lms/types` once the shared package is wired up.
 */
export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  ssoId: string;
  ssoProvider: string;
  avatarUrl: string | null;
  /** Student or lecturer code; null for admins. */
  code: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
