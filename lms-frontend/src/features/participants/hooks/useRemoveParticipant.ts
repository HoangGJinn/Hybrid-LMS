import { useMutation, useQueryClient } from '@tanstack/react-query'
import { enrollmentService } from '../api/enrollment.service'
import { participantKeys } from '../api/queryKeys'

export const useRemoveParticipant = (classId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentId: string) =>
      enrollmentService.removeParticipant(classId, studentId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: participantKeys.roster(classId) }),
        queryClient.invalidateQueries({ queryKey: participantKeys.candidatesAll(classId) }),
      ]),
  })
}