import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentUploadService } from '../api/document-upload.service';
import { documentKeys } from '../api/queryKeys';

interface UploadDocumentInput {
  classId: string;
  file: File;
}

/** Uploads a file to S3 and creates the document record (UC-29, steps 2-4 of the S3 flow). */
export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, file }: UploadDocumentInput) =>
      documentUploadService.upload(classId, file),
    onSuccess: (_document, { classId }) =>
      queryClient.invalidateQueries({
        queryKey: documentKeys.byClass(classId),
      }),
  });
};
