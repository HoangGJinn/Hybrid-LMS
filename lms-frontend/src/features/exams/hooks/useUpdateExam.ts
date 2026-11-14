import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { examService } from '../api/exam.service';
import { examKeys } from '../api/queryKeys';
import type { LecturerExam, NewExamInput } from '../types/exams.types';

interface UpdateExamVariables {
  classId: string;
  exam: LecturerExam;
  input: NewExamInput;
  /** The existing question file's id when the lecturer kept it; `null` when removed or replaced. */
  keptFileId: string | null;
}

/**
 * Lecturer: edits an exam, choosing the full update (`PUT`) while content is unlocked or the schedule-only
 * update (`PATCH .../schedule`) once the exam has opened or been started, then refreshes cached exam views.
 */
export const useUpdateExam = () => {
  const queryClient = useQueryClient();
  const uploadedFileIds = useRef(new WeakMap<File, string>());
  return useMutation({
    mutationFn: async ({
      classId,
      exam,
      input,
      keptFileId,
    }: UpdateExamVariables) => {
      if (exam.isContentLocked) {
        return examService.updateSchedule(
          classId,
          exam.id,
          exam.status === 'CLOSED'
            ? {
                examName: input.examName,
                showResults: input.showResults,
              }
            : {
                examName: input.examName,
                endTime: input.endTime,
                durationMinutes: input.durationMinutes,
                maxAttempts: input.maxAttempts,
                showResults: input.showResults,
              },
        );
      }
      let fileId: string | null =
        input.format === 'FILE' ? keptFileId : null;
      if (input.format === 'FILE' && input.file) {
        fileId =
          uploadedFileIds.current.get(input.file) ??
          (await examService.uploadQuestionFile(input.file));
        uploadedFileIds.current.set(input.file, fileId);
      }
      return examService.update(classId, exam.id, input, fileId);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: examKeys.all }),
  });
};

