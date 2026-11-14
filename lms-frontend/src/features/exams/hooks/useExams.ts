import { useQuery } from '@tanstack/react-query';
import { examService } from '../api/exam.service';
import { examKeys } from '../api/queryKeys';

/** Exams scheduled for the signed-in student's classes, with attempt counts and highest score. */
export const useUpcomingExams = () =>
  useQuery({
    queryKey: examKeys.upcoming,
    queryFn: () => examService.getUpcomingExams(),
  });

/** Lobby overview and attempt history of one exam for a student. */
export const useStudentExamLobby = (classId: string, examId: string) =>
  useQuery({
    queryKey: examKeys.studentLobby(classId, examId),
    queryFn: () => examService.getStudentLobby(classId, examId),
    enabled: classId !== '' && examId !== '',
  });

/** Full post-submission review of a completed attempt (`showResults === true`). */
export const useAttemptReview = (sessionId: string | null) =>
  useQuery({
    queryKey: examKeys.attemptReview(sessionId ?? ''),
    queryFn: () => examService.getAttemptReview(sessionId ?? ''),
    enabled: Boolean(sessionId),
  });
