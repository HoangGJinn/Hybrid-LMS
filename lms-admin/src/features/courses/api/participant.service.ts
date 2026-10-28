import { del, get, post } from '@/core/api/http';
import type {
  ImportResult,
  ImportRowPayload,
  ParticipantCandidate,
  ParticipantView,
} from '../types/courses.types';

const CANDIDATE_LIMIT = 20;

const base = (classId: string) => `/api/classes/${classId}/participants`;

/** Participants (enrolled students) of a class. */
export const participantService = {
  /** The whole list, no server paging; `search` matches name, email or student code. */
  getParticipants: (classId: string, search = ''): Promise<ParticipantView[]> =>
    get<ParticipantView[]>(base(classId), { search: search.trim() || undefined }),

  /** Students that can be added; the ones already in the class come back flagged. */
  searchCandidates: (
    classId: string,
    search = '',
  ): Promise<ParticipantCandidate[]> =>
    get<ParticipantCandidate[]>(`${base(classId)}/candidates`, {
      search: search.trim() || undefined,
      limit: CANDIDATE_LIMIT,
    }),

  /** 409 when the student is already a participant. */
  addParticipant: (classId: string, studentId: string): Promise<ParticipantView> =>
    post<ParticipantView>(base(classId), { studentId }),

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
