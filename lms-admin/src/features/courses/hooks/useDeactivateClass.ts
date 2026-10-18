import { useMutation, useQueryClient } from '@tanstack/react-query';
import { classService } from '../api/class.service';
import { courseKeys } from '../api/queryKeys';

export const useDeactivateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classService.deactivateClass(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: courseKeys.classes() }),
  });
};
