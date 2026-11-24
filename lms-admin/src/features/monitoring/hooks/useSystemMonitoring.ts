import { useState } from 'react';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { monitoringService } from '../api/monitoring.service';
import { monitoringKeys } from '../api/queryKeys';
import type { RefreshInterval } from '../types/monitoring.types';

export const useSystemMonitoring = (refetchInterval: RefreshInterval) => {
  const queryClient = useQueryClient();
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);

  const query = useQuery({
    queryKey: monitoringKeys.overview(),
    queryFn: () => monitoringService.getOverview(false),
    refetchInterval: refetchInterval || false,
    placeholderData: keepPreviousData,
  });

  const forceRefresh = async () => {
    setIsForceRefreshing(true);
    try {
      const fresh = await monitoringService.getOverview(true);
      queryClient.setQueryData(monitoringKeys.overview(), fresh);
    } finally {
      setIsForceRefreshing(false);
    }
  };

  return {
    ...query,
    isForceRefreshing,
    forceRefresh,
  };
};
