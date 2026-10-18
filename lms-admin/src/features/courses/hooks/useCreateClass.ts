import { useMutation, useQueryClient } from '@tanstack/react-query';
import { classService } from '../api/class.service';
import { courseKeys } from '../api/queryKeys';
import type { CreateClassPayload } from '../types/courses.types';

export const useCreateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClassPayload) =>
      classService.createClass(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: courseKeys.classes() }),
  });
};
