import { useMutation, useQueryClient } from '@tanstack/react-query'
import { enrollmentService } from '../api/enrollment.service'
import { participantKeys } from '../api/queryKeys'

export const useAddParticipant = (classId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentIds: string[]) =>
      enrollmentService.addParticipants(classId, studentIds),
    // Returned so `isPending` lasts until the refetch is done.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: participantKeys.roster(classId) }),
        queryClient.invalidateQueries({ queryKey: participantKeys.candidatesAll(classId) }),
      ]),
  })
}