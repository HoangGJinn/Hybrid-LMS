import { useQuery } from '@tanstack/react-query';
import { classService } from '../api/class.service';
import { courseKeys } from '../api/queryKeys';

const CLASSES_STALE_TIME_MS = 60_000; // 60 seconds

/** Classes the signed-in student is enrolled in. */
export const useMyClasses = () =>
  useQuery({
    queryKey: courseKeys.mine,
    queryFn: () => classService.getMyClasses(),
    staleTime: CLASSES_STALE_TIME_MS,
  });

/** Classes taught by the signed-in lecturer. Uses the same /api/classes/my endpoint. */
export const useLecturerClasses = () =>
  useQuery({
    queryKey: courseKeys.myLecturer,
    queryFn: () => classService.getLecturerClasses(),
    staleTime: CLASSES_STALE_TIME_MS,
  });

