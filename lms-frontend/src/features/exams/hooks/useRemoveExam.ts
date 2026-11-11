import { useMutation, useQueryClient } from '@tanstack/react-query';
import { examService } from '../api/exam.service';
import { examKeys } from '../api/queryKeys';

interface RemoveExamVariables {
  classId: string;
  examId: string;
}

/** UC-32: removes an exam from a class (the backend decides whether its data can be deleted too). */
export const useRemoveExam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, examId }: RemoveExamVariables) =>
      examService.remove(classId, examId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: examKeys.all }),
  });
};
