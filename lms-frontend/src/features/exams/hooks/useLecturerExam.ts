import { useQuery } from '@tanstack/react-query';
import { examService } from '../api/exam.service';
import { examKeys } from '../api/queryKeys';

/** A file exam carries a presigned link that expires after a few minutes, so the cache must not outlive it. */
const LECTURER_EXAM_STALE_TIME_MS = 5 * 60_000;

// `?? null` because TanStack Query v5 does not accept `undefined` as query data.
export const useLecturerExam = (classId: string, examId: string) =>
  useQuery({
    queryKey: examKeys.lecturerDetail(classId, examId),
    queryFn: async () =>
      (await examService.getLecturerExam(classId, examId)) ?? null,
    enabled: classId !== '' && examId !== '',
    staleTime: LECTURER_EXAM_STALE_TIME_MS,
    gcTime: LECTURER_EXAM_STALE_TIME_MS,
  });
