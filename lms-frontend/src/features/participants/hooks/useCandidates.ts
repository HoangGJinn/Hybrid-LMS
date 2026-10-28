import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { enrollmentService } from '../api/enrollment.service'
import { participantKeys } from '../api/queryKeys'

/** Students matching `search` who are not enrolled in the class yet. */
export const useCandidates = (classId: string, search: string) =>
  useQuery({
    queryKey: participantKeys.candidates(classId, search),
    queryFn: () => enrollmentService.searchCandidates(classId, search),
    enabled: classId !== '',
    placeholderData: keepPreviousData,
  })