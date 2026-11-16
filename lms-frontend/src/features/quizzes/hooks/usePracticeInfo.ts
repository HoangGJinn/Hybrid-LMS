import { useQuery } from '@tanstack/react-query';
import { quizService } from '../api/quiz.service';
import { quizKeys } from '../api/queryKeys';

export const usePracticeInfo = (classId: string, documentId: string) =>
  useQuery({
    queryKey: quizKeys.practice(classId, documentId),
    queryFn: () => quizService.getPracticeInfo(classId, documentId),
    enabled: classId !== '' && documentId !== '',
  });