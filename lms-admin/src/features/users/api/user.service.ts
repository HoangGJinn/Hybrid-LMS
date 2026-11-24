import { apiClient } from '@/core/api/client';
import { get, patch, post } from '@/core/api/http';
import type { PaginatedResult } from '@/core/types/pagination.types';
import type {
  CreateUserPayload,
  ManagedRole,
  ManagedUser,
  UpdateUserPayload,
  UserClassItem,
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

  /** Lists every class a lecturer teaches or a student is enrolled in (ended ones included). */
  getUserClasses: (role: ManagedRole, userId: string): Promise<UserClassItem[]> => {
    const segment = role === 'LECTURER' ? 'lecturers' : 'students';
    return get<UserClassItem[]>(`/api/classes/${segment}/${userId}`);
  },

  /**
   * Excel list of the classes a lecturer teaches / a student is enrolled in (ended ones included).
   * It goes through the app's HTTP client because a plain link would carry no login token.
   */
  exportClasses: async (role: ManagedRole, userId: string): Promise<Blob> => {
    const segment = role === 'LECTURER' ? 'lecturers' : 'students';
    const response = await apiClient.get<Blob>(
      `/api/classes/export/${segment}/${userId}`,
      { responseType: 'blob' },
    );
    return response.data;
  },
};