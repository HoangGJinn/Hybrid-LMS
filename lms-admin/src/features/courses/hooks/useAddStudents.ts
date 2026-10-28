import { useMutation, useQueryClient } from '@tanstack/react-query';
import { classStudentService } from '../api/class-student.service';
import { courseKeys } from '../api/queryKeys';

export const useAddStudents = (classId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentIds: string[]) =>
      classStudentService.addStudents(classId, studentIds),
    // Also refresh the class list: its "Students" column shows the count.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: courseKeys.classStudents(classId) }),
        queryClient.invalidateQueries({ queryKey: courseKeys.classes() }),
      ]),
  });
};