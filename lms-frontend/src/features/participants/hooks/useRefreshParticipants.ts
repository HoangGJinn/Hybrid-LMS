import { useQueryClient } from '@tanstack/react-query';
import { courseKeys } from '@features/courses';
import { participantKeys } from '../api/queryKeys';

/**
 * After the participants of a class changed: refetch the participant list, candidate flags and roster of that class,
 * the class itself and the class lists, so `studentCount` stays right on the Courses page and the Dashboard.
 */
export const useRefreshParticipants = (classId: string) => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: participantKeys.list(classId) }),
      queryClient.invalidateQueries({ queryKey: participantKeys.roster(classId) }),
      queryClient.invalidateQueries({ queryKey: participantKeys.candidatesAll(classId) }),
      // `exact`: `['course', id]` is also the prefix of the sections, which did not change.
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(classId), exact: true }),
      queryClient.invalidateQueries({ queryKey: courseKeys.myLecturer }),
      queryClient.invalidateQueries({ queryKey: courseKeys.mine }),
    ]);
};
