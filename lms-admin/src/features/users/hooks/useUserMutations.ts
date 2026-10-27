import { useMutation, useQueryClient } from '@tanstack/react-query';
import { courseKeys } from '@/features/courses';
import { userKeys } from '../api/queryKeys';
import { userService } from '../api/user.service';
import type { CreateUserPayload, UpdateUserPayload } from '../types/users.types';

/**
 * Every mutation refreshes all user lists, because a change can move a row between filters.
 * It also refreshes the class form's lecturer dropdown, which is built from the same accounts.
 */
const useRefreshUsers = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: userKeys.all }),
      queryClient.invalidateQueries({ queryKey: courseKeys.lecturers() }),
    ]);
};

export const useCreateUser = () => {
  const refresh = useRefreshUsers();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => userService.createUser(payload),
    onSuccess: refresh,
  });
};

export const useUpdateUser = () => {
  const refresh = useRefreshUsers();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      userService.updateUser(id, payload),
    onSuccess: refresh,
  });
};

export const useDeactivateUser = () => {
  const refresh = useRefreshUsers();
  return useMutation({
    mutationFn: (id: string) => userService.deactivateUser(id),
    onSuccess: refresh,
  });
};

export const useActivateUser = () => {
  const refresh = useRefreshUsers();
  return useMutation({
    mutationFn: (id: string) => userService.activateUser(id),
    onSuccess: refresh,
  });
};
