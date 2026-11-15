import { useMutation, useQueryClient } from '@tanstack/react-query';
import { questionBankService } from '../api/question-bank.service';
import { questionBankKeys } from '../api/queryKeys';
import { uploadImportFile } from '../api/upload-import-file';

interface ImportInput {
  subjectId: string;
  file: File;
}

/** Uploads the Excel file, asks the backend to import it, then refreshes everything that lists questions. */
export const useImportQuestions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ subjectId, file }: ImportInput) => {
      const fileId = await uploadImportFile(file);
      return questionBankService.importQuestions(subjectId, fileId);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: questionBankKeys.all }),
  });
};