import { useMutation, useQueryClient } from '@tanstack/react-query';
import { examService } from '../api/exam.service';
import { examKeys } from '../api/queryKeys';
import type { ExamAnswerInput } from '../types/exams.types';

interface StartExamSessionInput {
  classId: string;
  examId: string;
}

/** Starts a new attempt or resumes the active `IN_PROGRESS` attempt for the student. */
export const useStartExamSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, examId }: StartExamSessionInput) =>
      examService.startOrResumeAttempt(classId, examId),
    onSuccess: (_data, { classId, examId }) => {
      void queryClient.invalidateQueries({
        queryKey: examKeys.studentLobby(classId, examId),
      });
      void queryClient.invalidateQueries({ queryKey: examKeys.upcoming });
    },
  });
};

interface SubmitExamSessionInput {
  sessionId: string;
  answers: ExamAnswerInput[];
}

/** Submits the answers of an attempt and refreshes the student's exam lobby and exam list. */
export const useSubmitExamSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, answers }: SubmitExamSessionInput) =>
      examService.submitSession(sessionId, answers),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: examKeys.all });
    },
  });
};

interface SaveFileExamSubmissionInput {
  sessionId: string;
  keptFileIds: string[];
  newFiles: File[];
}

/** Uploads any newly selected files to S3 and saves/updates the student's FILE exam submission. */
export const useSaveFileExamSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      keptFileIds,
      newFiles,
    }: SaveFileExamSubmissionInput) => {
      const uploadedFileIds = await Promise.all(
        newFiles.map((file) => examService.uploadSubmissionFile(file)),
      );
      return examService.saveFileSubmission(sessionId, [
        ...keptFileIds,
        ...uploadedFileIds,
      ]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: examKeys.all });
    },
  });
};
