import { useQuery } from '@tanstack/react-query';
import { documentService } from '../api/document.service';
import { documentKeys } from '../api/queryKeys';

/**
 * The presigned file URL lives 10-15 minutes on the backend. Refetching after 5 minutes (and dropping
 * the cache just as fast) means a document opened from the cache never carries an expired link.
 */
const DOCUMENT_URL_STALE_TIME_MS = 5 * 60_000;

// `?? null` because TanStack Query v5 does not accept `undefined` as query data.
export const useDocument = (classId: string, documentId: string) =>
  useQuery({
    queryKey: documentKeys.detail(classId, documentId),
    queryFn: async () =>
      (await documentService.getDocument(classId, documentId)) ?? null,
    enabled: classId !== '' && documentId !== '',
    staleTime: DOCUMENT_URL_STALE_TIME_MS,
    gcTime: DOCUMENT_URL_STALE_TIME_MS,
  });
