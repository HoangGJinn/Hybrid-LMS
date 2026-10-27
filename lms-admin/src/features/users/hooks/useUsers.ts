import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { userKeys } from '../api/queryKeys';
import { userService } from '../api/user.service';
import type { UserListParams } from '../types/users.types';

/** One page of users. The previous page stays on screen while the next one (or a new filter) loads. */
export const useUsers = (params: UserListParams) =>
  useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userService.getUsers(params),
    placeholderData: keepPreviousData,
  });
