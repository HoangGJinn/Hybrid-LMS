import { useQuery } from '@tanstack/react-query';
import { documentService } from '../api/document.service';
import { documentKeys } from '../api/queryKeys';

// `?? null` because TanStack Query v5 does not accept `undefined` as query data.
export const useDocument = (id: string) =>
  useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: async () => (await documentService.getDocument(id)) ?? null,
    enabled: id !== '',
  });
