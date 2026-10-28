import { get, patch, post } from '@/core/api/http';
import type { PaginatedResult } from '@/core/types/pagination.types';
import type {
  CreateUserPayload,
  ManagedUser,
  UpdateUserPayload,
  UserListParams,
} from '../types/users.types';

/** Admin user management. Used by the Students and Lecturers pages. */
export const userService = {
  getUsers: (params: UserListParams): Promise<PaginatedResult<ManagedUser>> =>
    get<PaginatedResult<ManagedUser>>('/api/users', params),

  /** Pre-provisions an account; the person claims it by signing in with Google using this email. */
  createUser: (payload: CreateUserPayload): Promise<ManagedUser> =>
    post<ManagedUser>('/api/users', payload),

  updateUser: (id: string, payload: UpdateUserPayload): Promise<ManagedUser> =>
    patch<ManagedUser>(`/api/users/${id}`, payload),

  /** Soft delete: users are never removed. */
  deactivateUser: (id: string): Promise<ManagedUser> =>
    patch<ManagedUser>(`/api/users/${id}/deactivate`),

  activateUser: (id: string): Promise<ManagedUser> =>
    patch<ManagedUser>(`/api/users/${id}/activate`),
};
