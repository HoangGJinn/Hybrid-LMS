import { useMutation, useQueryClient } from '@tanstack/react-query';
import { classService } from '../api/class.service';
import { courseKeys } from '../api/queryKeys';
import type { UpdateClassPayload } from '../types/courses.types';

export const useUpdateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateClassPayload }) =>
      classService.updateClass(id, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: courseKeys.classes() }),
  });
};
