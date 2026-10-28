import { useCurrentUser } from '@features/auth';
import { combineQueries } from '@shared/utils/async-state';
import { useAssignment } from './useAssignment';
import { useAssignmentSubmissions } from './useAssignmentLists';

/** An assignment together with the signed-in student's own submission (`null` when not submitted yet). */
export const useAssignmentDetail = (assignmentId: string) => {
  const { data: user } = useCurrentUser();
  const studentId = user?.id;
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
