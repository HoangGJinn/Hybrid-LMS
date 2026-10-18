import { useMutation } from '@tanstack/react-query';
import { aiGenerateService } from '../api/ai-generate.service';
import type { GenerateDraftRequest } from '../types/ai-generate.types';

/** Asks the AI to draft questions. Nothing is stored server-side until the lecturer publishes. */
export const useGenerateDraft = () =>
  useMutation({
    mutationFn: (request: GenerateDraftRequest) =>
      aiGenerateService.generateDraft(request),
  });
