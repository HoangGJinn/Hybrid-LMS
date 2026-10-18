import { useQuery } from '@tanstack/react-query';
import { classService } from '../api/class.service';
import { courseKeys } from '../api/queryKeys';

/** Classes the signed-in student is enrolled in. */
export const useMyClasses = () =>
  useQuery({
    queryKey: courseKeys.mine,
    queryFn: () => classService.getMyClasses(),
  });

/** Classes taught by the signed-in lecturer. Uses the same /api/classes/my endpoint. */
export const useLecturerClasses = () =>
  useQuery({
    queryKey: courseKeys.myLecturer,
    queryFn: () => classService.getLecturerClasses(),
  });

