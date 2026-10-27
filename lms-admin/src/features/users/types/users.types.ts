import type { UserRole } from '@/core/types/auth.types';

// Mirrors backend `ManagedUserView`, `CreateManagedUserDto`, `UpdateUserDto`, `ListUsersQueryDto`.

export type StudentStatus = 'STUDYING' | 'GRADUATED' | 'SUSPENDED' | 'RESERVED';
export type LecturerStatus = 'WORKING' | 'RESIGNED' | 'ON_LEAVE';

/** The two kinds of account the management pages handle. */
export type ManagedRole = Extract<UserRole, 'STUDENT' | 'LECTURER'>;

/** A row of the student / lecturer management tables. */
export interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  /** false = deactivated (soft delete). */
  isActive: boolean;
  /** Student code or lecturer code. */
  code: string | null;
  /** StudentStatus for students, LecturerStatus for lecturers. */
  profileStatus: string | null;
  /** false = pre-provisioned account nobody has signed in to yet ("Pending"). */
  hasLoggedIn: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Query of GET /api/users. `limit` is capped at 100 by the backend. Undefined values are not sent. */
export interface UserListParams {
  role?: UserRole;
  isActive?: boolean;
  /** false = pending accounts (never signed in); true = accounts linked to a Google login. */
  hasLoggedIn?: boolean;
  /** Profile status (STUDYING, WORKING, ...). Meant to be combined with `role`. */
  status?: string;
  /** Matches full name or email. */
  search?: string;
  /** `createdAt` = newest first (default), `fullName` = A-Z. */
  sort?: 'createdAt' | 'fullName';
  page?: number;
  limit?: number;
}

/** Body of POST /api/users. Only the email is required; the role defaults to LECTURER. */
export interface CreateUserPayload {
  email: string;
  role?: ManagedRole;
  fullName?: string;
  code?: string;
}

/** Body of PATCH /api/users/:id. The email can change only while `hasLoggedIn` is false; the code never changes. */
export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  /** Moves the account between student and lecturer (new code, default status). */
  role?: ManagedRole;
  /** Ignored by the form when the role changes: the new profile starts from its default status. */
  status?: string;
}

/** Account filter of the list pages, one option per badge. `isActive` / `hasLoggedIn` are derived from it. */
export type AccountFilter = 'all' | 'active' | 'pending' | 'inactive';

/** What a row's badge says: Pending (never signed in) → Active, or Inactive (deactivated). */
export type AccountState = 'pending' | 'active' | 'inactive';
