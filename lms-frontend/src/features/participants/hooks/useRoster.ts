import { useQuery } from '@tanstack/react-query'
import { participantService } from '../api/participant.service'
import { participantKeys } from '../api/queryKeys'

/** Lecturer view of a class: students with scores, mastery and the at-risk flag. */
export const useRoster = (classId: string) =>
  useQuery({ queryKey: participantKeys.roster(classId), queryFn: () => participantService.getRoster(classId), enabled: classId !== '' })
