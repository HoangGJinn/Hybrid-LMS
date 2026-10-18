import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QuizAnswer } from '@features/quizzes';
import { examService } from '../api/exam.service';
import { examKeys } from '../api/queryKeys';

/** Opens an exam session. A POST with side effects, so it is a mutation and never a query. */
export const useStartExamSession = () =>
  useMutation({
    mutationFn: (examScheduleId: string) =>
      examService.startSession(examScheduleId),
  });

interface SubmitExamSessionInput {
  sessionId: string;
  answers: QuizAnswer[];
}

/** Submits the answers of a session and refreshes the exam list. */
export const useSubmitExamSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, answers }: SubmitExamSessionInput) =>
      examService.submitSession(sessionId, answers),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: examKeys.upcoming }),
  });
};
