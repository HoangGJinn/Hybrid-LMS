import { useMutation, useQueryClient } from '@tanstack/react-query';
import { classService } from '../api/class.service';
import { courseKeys } from '../api/queryKeys';

export const useRemoveClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classService.removeClass(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: courseKeys.all }),
  });
};
