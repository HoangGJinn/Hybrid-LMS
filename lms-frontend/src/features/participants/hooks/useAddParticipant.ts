import { useMutation } from '@tanstack/react-query';
import { participantManagementService } from '../api/participant-management.service';
import { useRefreshParticipants } from './useRefreshParticipants';

export const useAddParticipant = (classId: string) => {
  const refresh = useRefreshParticipants(classId);
  return useMutation({
    mutationFn: (studentIds: string[]) =>
      participantManagementService.addParticipants(classId, studentIds),
    // Returned so `isPending` lasts until the refetch is done.
    onSuccess: refresh,
  });
};
