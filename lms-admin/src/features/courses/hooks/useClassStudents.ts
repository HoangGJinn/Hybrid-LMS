import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { classStudentService } from '../api/class-student.service';
import { courseKeys } from '../api/queryKeys';

export const useClassStudents = (classId: string) =>
  useQuery({
    queryKey: courseKeys.classStudents(classId),
    queryFn: () => classStudentService.getStudents(classId),
    enabled: classId !== '',
  });

export const useAvailableStudents = (classId: string, search: string) =>
  useQuery({
    queryKey: courseKeys.availableStudents(classId, search),
    queryFn: () => classStudentService.getAvailableStudents(classId, search),
    enabled: classId !== '',
    placeholderData: keepPreviousData,
  });