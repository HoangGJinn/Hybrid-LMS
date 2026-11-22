import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentKeys } from '@features/assignments';
import { gradingService } from '../api/grading.service';
import { gradingKeys } from '../api/queryKeys';
import type { PendingSubmission } from '../types/grading.types';

interface GradeSubmissionInput {
  submission: PendingSubmission;
  score: number;
  comment: string;
}

/** Saves a grade, then refreshes the grading queue and the students' submission lists. */
export const useGradeSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submission, score, comment }: GradeSubmissionInput) =>
      gradingService.grade(submission, score, comment),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: gradingKeys.all }),
        queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
      ]),
  });
};