import { useMutation } from '@tanstack/react-query';
import { assignmentService } from '../api/assignment.service';
import type { NewAssignmentInput } from '../types/assignments.types';

interface CreateAssignmentInput {
  classId: string;
  input: NewAssignmentInput;
}

/** UC-33: creates an assignment; the caller places it in a section of the draft. */
export const useCreateAssignment = () =>
  useMutation({
    mutationFn: ({ classId, input }: CreateAssignmentInput) =>
      assignmentService.create(classId, input),
  });