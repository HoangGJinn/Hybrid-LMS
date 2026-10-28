import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { courseKeys } from '../api/queryKeys';
import { participantService } from '../api/participant.service';
import type { ImportRowPayload } from '../types/courses.types';

/** Participants of a class. The previous list stays on screen while a new search loads. */
export const useParticipants = (classId: string, search: string) =>
  useQuery({
    queryKey: courseKeys.participantList(classId, search),
    queryFn: () => participantService.getParticipants(classId, search),
    placeholderData: keepPreviousData,
  });

/** Students offered by "Add Participant". */
export const useParticipantCandidates = (classId: string, search: string) =>
  useQuery({
    queryKey: courseKeys.candidates(classId, search),
    queryFn: () => participantService.searchCandidates(classId, search),
    placeholderData: keepPreviousData,
  });

/** After a change: the participant lists and candidate flags, the class itself and the student counts of the class list. */
const useRefreshParticipants = (classId: string) => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: courseKeys.participants(classId),
      }),
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(classId) }),
      queryClient.invalidateQueries({ queryKey: courseKeys.classes() }),
    ]);
};

export const useAddParticipant = (classId: string) => {
  const refresh = useRefreshParticipants(classId);
  return useMutation({
    mutationFn: (studentId: string) =>
      participantService.addParticipant(classId, studentId),
    onSuccess: refresh,
  });
};

export const useRemoveParticipant = (classId: string) => {
  const refresh = useRefreshParticipants(classId);
  return useMutation({
    mutationFn: (studentId: string) =>
      participantService.removeParticipant(classId, studentId),
    onSuccess: refresh,
  });
};

interface ImportVariables {
  rows: ImportRowPayload[];
  /** true = preview only: nothing changes, so nothing is refreshed. */
  dryRun: boolean;
}

export const useImportParticipants = (classId: string) => {
  const refresh = useRefreshParticipants(classId);
  return useMutation({
    mutationFn: ({ rows, dryRun }: ImportVariables) =>
      participantService.importParticipants(classId, rows, dryRun),
    onSuccess: (_result, { dryRun }) => (dryRun ? undefined : refresh()),
  });
};
