import { useQuery } from '@tanstack/react-query';
import { examService } from '../api/exam.service';
import { examKeys } from '../api/queryKeys';

/** Exams scheduled for the signed-in student's classes. */
export const useUpcomingExams = () =>
  useQuery({
    queryKey: examKeys.upcoming,
    queryFn: () => examService.getUpcomingExams(),
  });

/** Questions of an exam. Never refetched while the room is open, so the question order cannot change under the student. */
export const useExamQuestions = (examId: string) =>
  useQuery({
    queryKey: examKeys.questions(examId),
    queryFn: () => examService.getQuestions(examId),
    enabled: examId !== '',
    staleTime: Infinity,
  });
