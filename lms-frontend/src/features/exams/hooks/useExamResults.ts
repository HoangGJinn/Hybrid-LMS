import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { examService } from '../api/exam.service';
import { examKeys } from '../api/queryKeys';
import type { GradeExamSessionInput } from '../types/exams.types';

const RESULTS_STALE_TIME_MS = 60_000;

/** Fetches the full class exam results table and summary statistics for the lecturer. */
export const useLecturerExamResults = (classId: string, examId: string) =>
  useQuery({
    queryKey: examKeys.lecturerResults(classId, examId),
    queryFn: () => examService.getLecturerResults(classId, examId),
    enabled: classId !== '' && examId !== '',
    staleTime: RESULTS_STALE_TIME_MS,
  });

/** Lecturer mutation to grade or re-grade a student's exam attempt (`0..10` + optional feedback comment). */
export const useGradeExamSession = (classId: string, examId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      input,
    }: {
      sessionId: string;
      input: GradeExamSessionInput;
    }) => examService.gradeSession(classId, examId, sessionId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: examKeys.lecturerResults(classId, examId),
      });
      void queryClient.invalidateQueries({
        queryKey: examKeys.lecturerDetail(classId, examId),
      });
      // Keep the cross-class Grading Desk in sync without importing @features/grading (avoids cycle).
      void queryClient.invalidateQueries({
        queryKey: ['grading'],
      });
    },
  });
};

/** Lecturer query to inspect a specific student attempt (questions + answers or FILE submission). */
export const useLecturerAttemptReview = (
  classId: string,
  examId: string,
  sessionId: string | null,
) =>
  useQuery({
    queryKey: examKeys.lecturerAttemptReview(
      classId,
      examId,
      sessionId ?? '',
    ),
    queryFn: () =>
      examService.getLecturerAttemptReview(
        classId,
        examId,
        sessionId as string,
      ),
    enabled:
      classId !== '' && examId !== '' && sessionId !== null && sessionId !== '',
  });

