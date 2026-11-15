import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { questionBankService } from '../api/question-bank.service';
import { questionBankKeys } from '../api/queryKeys';
import type { QuestionListParams } from '../types/question-bank.types';

/** One page of questions. The previous page stays on screen while the next one loads. */
export const useQuestions = (params: QuestionListParams) =>
  useQuery({
    queryKey: questionBankKeys.list(params),
    queryFn: () => questionBankService.listQuestions(params),
    enabled: params.subjectId !== '',
    placeholderData: keepPreviousData,
  });