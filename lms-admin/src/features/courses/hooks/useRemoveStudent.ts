import { useMutation, useQueryClient } from '@tanstack/react-query';
import { classStudentService } from '../api/class-student.service';
import { courseKeys } from '../api/queryKeys';

export const useRemoveStudent = (classId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) =>
      classStudentService.removeStudent(classId, studentId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: courseKeys.classStudents(classId) }),
        queryClient.invalidateQueries({ queryKey: courseKeys.classes() }),
      ]),
  });
};