import { useMutation } from '@tanstack/react-query';
import { participantManagementService } from '../api/participant-management.service';
import type { ImportRowPayload } from '../types/participant-management.types';
import { useRefreshParticipants } from './useRefreshParticipants';

interface ImportVariables {
  rows: ImportRowPayload[];
  /** true = preview only: nothing changes, so nothing is refreshed. */
  dryRun: boolean;
}

export const useImportParticipants = (classId: string) => {
  const refresh = useRefreshParticipants(classId);
  return useMutation({
    mutationFn: ({ rows, dryRun }: ImportVariables) =>
      participantManagementService.importParticipants(classId, rows, dryRun),
    onSuccess: (_result, { dryRun }) => (dryRun ? undefined : refresh()),
  });
};
