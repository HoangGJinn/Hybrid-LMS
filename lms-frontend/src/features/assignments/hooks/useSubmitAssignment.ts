import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentService } from '../api/assignment.service';
import { assignmentKeys } from '../api/queryKeys';

interface SubmitAssignmentInput {
  assignmentId: string;
  fileNames: string[];
}

/** Submits (or resubmits) the student's files; refreshes every assignment/submission list afterwards. */
export const useSubmitAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, fileNames }: SubmitAssignmentInput) =>
      assignmentService.submit(assignmentId, fileNames),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
};
