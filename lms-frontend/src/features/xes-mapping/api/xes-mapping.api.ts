import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from '@core/api/http';

export interface KcSuggestion {
  kcId: string;
  kcName: string;
  xesRoute: string;
  xesKc: string;
  score: number;
  status: 'SUGGESTED' | 'CONFIRMED';
  questionCount: number;
}

const keys = {
  list: (subjectId: string) => ['xes-mapping', subjectId] as const,
};

const service = {
  list: (subjectId: string): Promise<KcSuggestion[]> =>
    get('/api/xes-mappings', { subjectId }),
  suggest: (subjectId: string): Promise<KcSuggestion[]> =>
    post('/api/xes-mappings/suggest', { subjectId }),
  confirm: (kcId: string, routes: string[]): Promise<{ ok: boolean }> =>
    patch(`/api/xes-mappings/kcs/${kcId}/confirm`, { routes }),
  backfill: (subjectId: string): Promise<{ mapped: number; skipped: number }> =>
    post('/api/xes-mappings/backfill', { subjectId }),
};

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export const useXesMappings = (subjectId: string) =>
  useQuery({
    queryKey: keys.list(subjectId),
    queryFn: () => service.list(subjectId),
    enabled: isUuid(subjectId),
  });

export const useSuggestXes = (subjectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => service.suggest(subjectId),
    onSuccess: (rows) => qc.setQueryData(keys.list(subjectId), rows),
  });
};

export const useConfirmXes = (subjectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { kcId: string; routes: string[] }) =>
      service.confirm(v.kcId, v.routes),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(subjectId) }),
  });
};

export const useBackfillXes = (subjectId: string) =>
  useMutation({ mutationFn: () => service.backfill(subjectId) });