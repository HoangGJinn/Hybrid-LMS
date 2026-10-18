import { useCurrentUserId } from '@core/hooks/useCurrentUserId';
import { combineQueries } from '@shared/utils/async-state';
import { useAssignment } from './useAssignment';
import { useAssignmentSubmissions } from './useAssignmentLists';

/** An assignment together with the signed-in student's own submission (`null` when not submitted yet). */
export const useAssignmentDetail = (assignmentId: string) => {
  const studentId = useCurrentUserId();
  const assignment = useAssignment(assignmentId);
  const submissions = useAssignmentSubmissions(assignmentId);
  return combineQueries(
    [assignment, submissions] as const,
    ([assignmentData, submissionList]) => ({
      assignment: assignmentData,
      mine:
        submissionList.find(
          (submission) => submission.submittedBy === studentId,
        ) ?? null,
    }),
  );
};
