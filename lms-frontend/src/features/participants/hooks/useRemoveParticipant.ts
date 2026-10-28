import { useMutation } from '@tanstack/react-query';
import { participantManagementService } from '../api/participant-management.service';
import { useRefreshParticipants } from './useRefreshParticipants';

export const useRemoveParticipant = (classId: string) => {
  const refresh = useRefreshParticipants(classId);
  return useMutation({
    mutationFn: (studentId: string) =>
      participantManagementService.removeParticipant(classId, studentId),
    onSuccess: refresh,
  });
};
