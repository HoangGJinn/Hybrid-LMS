export type UserRole = 'STUDENT' | 'LECTURER' | 'ADMIN';

// Must stay in sync with backend UserView
export interface AuthUser {
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

/** The few user fields kept in localStorage for instant access (names, never tokens). Cleared on logout. */
export interface UserProfile {
  fullName: string;
  code: string | null;
  email: string;
}
