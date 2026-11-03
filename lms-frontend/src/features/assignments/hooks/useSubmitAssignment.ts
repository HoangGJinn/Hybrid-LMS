import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentService } from '../api/assignment.service';
import { assignmentKeys } from '../api/queryKeys';
import type { SubmissionInput } from '../types/assignments.types';

interface SubmitAssignmentInput {
  classId: string;
  assignmentId: string;
  submission: SubmissionInput;
}

/** Submits (or edits) the student's work; refreshes every assignment/submission list afterwards. */
export const useSubmitAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, assignmentId, submission }: SubmitAssignmentInput) =>
      assignmentService.submit(classId, assignmentId, submission),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
};