import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentKeys } from '@features/assignments';
import { examKeys } from '@features/exams';
import { gradingService } from '../api/grading.service';
import { gradingKeys } from '../api/queryKeys';
import type { GradingQueueItem } from '../types/grading.types';

interface GradeQueueItemInput {
  item: GradingQueueItem;
  score: number;
  comment: string;
}

/** Saves a grade for either an assignment submission or a FILE exam session, then refreshes all related caches. */
export const useGradeQueueItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ item, score, comment }: GradeQueueItemInput): Promise<unknown> =>
      item.kind === 'assignment'
        ? gradingService.grade(item.submission, score, comment)
        : gradingService.gradeExamSession(
            item.classId,
            item.examId,
            item.sessionId,
            score,
            comment,
          ),
    onSuccess: (_data, { item }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: gradingKeys.all }),
        item.kind === 'assignment'
          ? queryClient.invalidateQueries({ queryKey: assignmentKeys.all })
          : Promise.all([
              queryClient.invalidateQueries({
                queryKey: examKeys.lecturerResults(item.classId, item.examId),
              }),
              queryClient.invalidateQueries({
                queryKey: examKeys.lecturerDetail(item.classId, item.examId),
              }),
              queryClient.invalidateQueries({ queryKey: examKeys.all }),
            ]),
      ]),
  });
};

