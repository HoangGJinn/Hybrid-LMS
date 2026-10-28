import { apiClient } from '@core/api/client'
import { get, post } from '@core/api/http'
import type {
  AddParticipantsResult,
  StudentCandidate,
} from '../types/participant-management.types'

export const enrollmentService = {
  /** Active students not yet in the class; an empty search lists the first few. */
  searchCandidates: (classId: string, search: string): Promise<StudentCandidate[]> =>
    get(`/api/classes/${classId}/participants/candidates`, {
      search: search.trim() || undefined,
    }),

  addParticipants: (classId: string, studentIds: string[]): Promise<AddParticipantsResult> =>
    post(`/api/classes/${classId}/participants`, { studentIds }),

  removeParticipant: async (classId: string, studentId: string): Promise<void> => {
    await apiClient.delete(`/api/classes/${classId}/participants/${studentId}`)
  },
}