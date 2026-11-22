import { useMutation } from '@tanstack/react-query';
import { assignmentService } from '../api/assignment.service';
import type { NewAssignmentInput } from '../types/assignments.types';

interface CreateAssignmentInput {
  classId: string;
  input: NewAssignmentInput;
  /** Section to place the assignment in; the server places it in the same request. */
  sectionId?: string;
}

/** UC-33: creates an assignment and, when `sectionId` is given, places it in that section. */
export const useCreateAssignment = () =>
  useMutation({
    mutationFn: ({ classId, input, sectionId }: CreateAssignmentInput) =>
      assignmentService.create(classId, input, sectionId),
  });