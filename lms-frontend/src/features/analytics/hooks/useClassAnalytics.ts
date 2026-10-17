import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '../api/analytics.service'
import { analyticsKeys } from '../api/queryKeys'

// `?? null` because TanStack Query v5 does not accept `undefined` as query data.
export const useClassAnalytics = (classId: string) =>
  useQuery({
    queryKey: analyticsKeys.byClass(classId),
    queryFn: async () => (await analyticsService.getAnalytics(classId)) ?? null,
    enabled: classId !== '',
  })
