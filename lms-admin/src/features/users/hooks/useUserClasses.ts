import { useQuery } from '@tanstack/react-query';
import { userKeys } from '../api/queryKeys';
import { userService } from '../api/user.service';
import type { ManagedRole } from '../types/users.types';

/** Fetches every class a lecturer teaches or a student is enrolled in. */
export const useUserClasses = (role: ManagedRole, userId: string | null) =>
  useQuery({
    queryKey: userKeys.classes(role, userId ?? ''),
    queryFn: () => userService.getUserClasses(role, userId!),
    enabled: Boolean(userId),
  });
