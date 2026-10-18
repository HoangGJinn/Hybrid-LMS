import { useMutation, useQueryClient } from '@tanstack/react-query';
import { examKeys } from '@features/exams';
import { quizKeys } from '@features/quizzes';
import { aiGenerateService } from '../api/ai-generate.service';
import type { DraftQuestion, PublishTarget } from '../types/ai-generate.types';

interface PublishAssessmentInput {
  classId: string;
  title: string;
  target: PublishTarget;
  questions: DraftQuestion[];
}

/** Publishes the reviewed drafts as a quiz or an exam and refreshes the lists that now contain it. */
export const usePublishAssessment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      classId,
      title,
      target,
      questions,
    }: PublishAssessmentInput) =>
      aiGenerateService.publish(classId, title, target, questions),
    onSuccess: (_published, { target }) =>
      queryClient.invalidateQueries({
        queryKey: target === 'QUIZ' ? quizKeys.all : examKeys.all,
      }),
  });
};
