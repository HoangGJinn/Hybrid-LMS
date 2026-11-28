import { useQuery } from '@tanstack/react-query';
import { questionBankService } from '../api/question-bank.service';
import { questionBankKeys } from '../api/queryKeys';

/** The lecturer's own Excel imports for one subject, newest first. */
export const useImportBatches = (subjectId: string) =>
  useQuery({
    queryKey: questionBankKeys.batches(subjectId),
    queryFn: () => questionBankService.listBatches(subjectId),
    enabled: subjectId !== '',
  });