import { useQuery } from '@tanstack/react-query';
import { questionBankService } from '../api/question-bank.service';
import { questionBankKeys } from '../api/queryKeys';

/** Subjects the lecturer can manage questions for. */
export const useSubjects = () =>
  useQuery({
    queryKey: questionBankKeys.subjects,
    queryFn: () => questionBankService.getSubjects(),
  });