import { useMutation, useQueryClient } from '@tanstack/react-query';
import { classService } from '../api/class.service';
import { courseKeys } from '../api/queryKeys';
import type { ClassFilePayload } from '../types/courses.types';

interface ImportVariables {
  files: ClassFilePayload[];
  /** true = preview only: nothing changes, so nothing is refreshed. */
  dryRun: boolean;
}

export const useImportClassData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ files, dryRun }: ImportVariables) =>
      classService.importClassData(files, dryRun),
    onSuccess: (_result, { dryRun }) =>
      dryRun
        ? undefined
        : queryClient.invalidateQueries({ queryKey: courseKeys.classes() }),
  });
};