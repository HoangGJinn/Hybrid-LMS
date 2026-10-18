import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../api/document.service';
import { documentKeys } from '../api/queryKeys';

/** Records that the student opened a document. */
export const useMarkDocumentSeen = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => documentService.markSeen(documentId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: documentKeys.all }),
  });
};
