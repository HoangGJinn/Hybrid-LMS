import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentService } from '../api/assignment.service';
import { assignmentKeys } from '../api/queryKeys';
import type { UpdateAssignmentInput } from '../types/assignments.types';

interface UpdateAssignmentVariables {
  classId: string;
  assignmentId: string;
  input: UpdateAssignmentInput;
}

/** Lecturer: edits an assignment, then refreshes every cached view of it (detail, lists, calendar). */
export const useUpdateAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, assignmentId, input }: UpdateAssignmentVariables) =>
      assignmentService.update(classId, assignmentId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
};