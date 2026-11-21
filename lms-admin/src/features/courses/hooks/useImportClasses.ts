import { useMutation, useQueryClient } from '@tanstack/react-query';
import { classService } from '../api/class.service';
import { courseKeys } from '../api/queryKeys';
import type { ClassImportRowPayload } from '../types/courses.types';

interface ImportVariables {
  rows: ClassImportRowPayload[];
  /** true = preview only: nothing changes, so nothing is refreshed. */
  dryRun: boolean;
}

export const useImportClasses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, dryRun }: ImportVariables) =>
      classService.importClasses(rows, dryRun),
    onSuccess: (_result, { dryRun }) =>
      dryRun
        ? undefined
        : queryClient.invalidateQueries({ queryKey: courseKeys.classes() }),
  });
};