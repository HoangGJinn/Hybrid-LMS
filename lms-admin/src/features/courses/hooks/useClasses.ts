import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { classService } from '../api/class.service';
import { courseKeys } from '../api/queryKeys';
import type { ClassFilters } from '../types/courses.types';

/** Classes matching the filters. The previous result stays on screen while new filters load. */
export const useClasses = (filters: ClassFilters) =>
  useQuery({
    queryKey: courseKeys.classList(filters),
    queryFn: () => classService.getClasses(filters),
    placeholderData: keepPreviousData,
  });
