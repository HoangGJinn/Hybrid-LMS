import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../api/document.service';
import { documentKeys } from '../api/queryKeys';

interface MarkDocumentSeenInput {
  classId: string;
  documentId: string;
}

/** Records that the student opened a document. */
export const useMarkDocumentSeen = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, documentId }: MarkDocumentSeenInput) =>
      documentService.markSeen(classId, documentId),
    // Only the lists need the new "seen" flag. The open document keeps its cached URL, so it is not reloaded.
    onSuccess: (_result, { classId }) =>
      queryClient.invalidateQueries({
        queryKey: documentKeys.byClass(classId),
      }),
  });
};
