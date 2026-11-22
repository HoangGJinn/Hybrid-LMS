import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../api/document.service';
import { documentKeys } from '../api/queryKeys';

interface RemoveDocumentInput {
  classId: string;
  documentId: string;
}

/** UC-30: removes a document from the class and deletes its stored file (the backend decides what can be deleted). */
export const useRemoveDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, documentId }: RemoveDocumentInput) =>
      documentService.remove(classId, documentId),
    onSuccess: (_result, { classId }) =>
      queryClient.invalidateQueries({ queryKey: documentKeys.byClass(classId) }),
  });
};