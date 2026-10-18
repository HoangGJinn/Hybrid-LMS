import { useQuery } from '@tanstack/react-query';
import { useCurrentUserId } from '@core/hooks/useCurrentUserId';
import { classService } from '../api/class.service';
import { courseKeys } from '../api/queryKeys';

/** Classes the signed-in student is enrolled in. */
export const useMyClasses = () =>
  useQuery({
    queryKey: courseKeys.mine,
    queryFn: () => classService.getMyClasses(),
  });

/** Classes taught by the signed-in lecturer. */
export const useLecturerClasses = () => {
  const lecturerId = useCurrentUserId();
  return useQuery({
    queryKey: courseKeys.lecturer(lecturerId ?? ''),
    queryFn: () => classService.getLecturerClasses(lecturerId ?? ''),
    enabled: Boolean(lecturerId),
  });
};
