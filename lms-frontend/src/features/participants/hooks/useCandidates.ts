import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { participantManagementService } from '../api/participant-management.service';
import { participantKeys } from '../api/queryKeys';

/** Students matching `search`; the ones already in the class come back with `alreadyInClass: true`. */
export const useCandidates = (classId: string, search: string) =>
  useQuery({
    queryKey: participantKeys.candidates(classId, search),
    queryFn: () => participantManagementService.searchCandidates(classId, search),
    enabled: classId !== '',
    placeholderData: keepPreviousData,
  });
