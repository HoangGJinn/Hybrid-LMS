import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentService } from '../api/assignment.service';
import { assignmentKeys } from '../api/queryKeys';

interface RemoveAssignmentInput {
  classId: string;
  assignmentId: string;
}

/** UC-34: removes an assignment from a class (the backend decides whether its data can be deleted too). */
export const useRemoveAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, assignmentId }: RemoveAssignmentInput) =>
      assignmentService.remove(classId, assignmentId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
};