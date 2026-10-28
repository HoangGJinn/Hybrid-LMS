import { del, get, post } from '@core/api/http';
import type {
  AddParticipantsResult,
  ImportResult,
  ImportRowPayload,
  ParticipantCandidate,
  ParticipantView,
} from '../types/participant-management.types';

const CANDIDATE_LIMIT = 20;

const base = (classId: string) => `/api/classes/${classId}/participants`;

/** Managing the students of a class (lecturer of the class or admin). All calls go through `/participants`, like the admin app. */
export const participantManagementService = {
  /** The whole list, no server paging. */
  getParticipants: (classId: string): Promise<ParticipantView[]> =>
    get<ParticipantView[]>(base(classId)),

  /** Students that can be added; the ones already in the class come back flagged. */
  searchCandidates: (classId: string, search = ''): Promise<ParticipantCandidate[]> =>
    get<ParticipantCandidate[]>(`${base(classId)}/candidates`, {
      search: search.trim() || undefined,
      limit: CANDIDATE_LIMIT,
    }),

  /** Adds several students at once; the ones already in the class are skipped. */
  addParticipants: (classId: string, studentIds: string[]): Promise<AddParticipantsResult> =>
    post<AddParticipantsResult>(`${base(classId)}/bulk`, { studentIds }),

  removeParticipant: (classId: string, studentId: string): Promise<void> =>
    del(`${base(classId)}/${studentId}`),

  /** `dryRun: true` only reports what the import would do. */
  importParticipants: (
    classId: string,
    rows: ImportRowPayload[],
    dryRun: boolean,
  ): Promise<ImportResult> =>
    post<ImportResult>(`${base(classId)}/import`, { rows, dryRun }),
};
