import type { ManagedRole, UserListParams } from '../types/users.types';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: UserListParams) => [...userKeys.lists(), params] as const,
  classes: (role: ManagedRole, userId: string) =>
    [...userKeys.all, 'classes', role, userId] as const,
};
