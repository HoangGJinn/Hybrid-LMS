import { useQuery } from '@tanstack/react-query';
import { classService } from '../api/class.service';
import { courseKeys } from '../api/queryKeys';

/** One class with its student count (GET /api/classes/:id). */
export const useClass = (classId: string) =>
  useQuery({
    queryKey: courseKeys.detail(classId),
    queryFn: () => classService.getClass(classId),
    enabled: Boolean(classId),
  });
