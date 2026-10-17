import { useQuery } from '@tanstack/react-query'
import { participantService } from '../api/participant.service'
import { participantKeys } from '../api/queryKeys'

export const useClassmates = (courseId: string) =>
  useQuery({
    queryKey: participantKeys.classmates(courseId),
    queryFn: () => participantService.getClassmates(courseId),
    enabled: courseId !== '',
  })
