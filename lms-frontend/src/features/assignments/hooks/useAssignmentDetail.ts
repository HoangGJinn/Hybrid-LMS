import { useQuery } from '@tanstack/react-query';
import { assignmentService } from '../api/assignment.service';
import { assignmentKeys } from '../api/queryKeys';

/**
 * The download links inside an assignment live a few minutes on the backend, so the cache is dropped just as
 * fast: an assignment opened from the cache never carries an expired link.
 */
const ASSIGNMENT_STALE_TIME_MS = 5 * 60_000;

/** One assignment of a class with its files and the signed-in student's own submission. */
export const useAssignmentDetail = (classId: string, assignmentId: string) =>
  useQuery({
    queryKey: assignmentKeys.inClass(classId, assignmentId),
    // `?? null` because TanStack Query v5 does not accept `undefined` as query data.
    queryFn: async () =>
      (await assignmentService.getDetail(classId, assignmentId)) ?? null,
    enabled: classId !== '' && assignmentId !== '',
    staleTime: ASSIGNMENT_STALE_TIME_MS,
    gcTime: ASSIGNMENT_STALE_TIME_MS,
  });