import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from '@core/api/http';

export interface XesRoute {
  xesRoute: string;
  xesKc: string;
  path: string;
  questionCount: number;
}

export interface KcMapping {
  kcId: string;
  kcName: string;
  bankQuestionCount: number;
  routes: XesRoute[];
}

export interface BackfillResult {
  mapped: number;
  skipped: number;
  unmappedKcs: string[];
}

const keys = {
  list: (subjectId: string) => ['xes-mapping', subjectId] as const,
  search: (q: string) => ['xes-routes', q] as const,
};

const service = {
  list: (subjectId: string): Promise<KcMapping[]> =>
    get('/api/xes-mappings', { subjectId }),
  search: (q: string): Promise<XesRoute[]> =>
    get('/api/xes-mappings/routes', { q }),
  save: (
    kcId: string,
    routes: string[],
  ): Promise<{ ok: boolean; backfill: BackfillResult | null }> =>
    patch(`/api/xes-mappings/kcs/${kcId}/confirm`, { routes }),
  backfill: (subjectId: string): Promise<BackfillResult> =>
    post('/api/xes-mappings/backfill', { subjectId }),
};

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export const useXesMappings = (subjectId: string) =>
  useQuery({
    queryKey: keys.list(subjectId),
    queryFn: () => service.list(subjectId),
    enabled: isUuid(subjectId),
  });

export const useSearchXesRoutes = (q: string) =>
  useQuery({
    queryKey: keys.search(q),
    queryFn: () => service.search(q),
    staleTime: 5 * 60 * 1000,
  });

export const useSaveXesRoutes = (subjectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { kcId: string; routes: string[] }) =>
      service.save(v.kcId, v.routes),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(subjectId) }),
  });
};

export const useBackfillXes = (subjectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => service.backfill(subjectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(subjectId) }),
  });
};