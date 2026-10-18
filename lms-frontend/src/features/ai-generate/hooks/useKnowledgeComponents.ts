import { useQuery } from '@tanstack/react-query';
import { aiGenerateService } from '../api/ai-generate.service';
import { aiGenerateKeys } from '../api/queryKeys';

/** Knowledge components extracted from the selected documents. Idle until at least one document is selected. */
export const useKnowledgeComponents = (documentIds: string[]) =>
  useQuery({
    queryKey: aiGenerateKeys.knowledgeComponents(documentIds),
    queryFn: () => aiGenerateService.getKnowledgeComponents(documentIds),
    enabled: documentIds.length > 0,
  });
