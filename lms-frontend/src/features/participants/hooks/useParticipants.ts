import { useQuery } from '@tanstack/react-query';
import { participantManagementService } from '../api/participant-management.service';
import { participantKeys } from '../api/queryKeys';

/** Every participant of a class (joined date, status, active flag). Search and letter filters run on the client. */
export const useParticipants = (classId: string) =>
  useQuery({
    queryKey: participantKeys.list(classId),
    queryFn: () => participantManagementService.getParticipants(classId),
    enabled: classId !== '',
  });
