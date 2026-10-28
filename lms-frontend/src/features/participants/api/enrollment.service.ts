import { apiClient } from '@core/api/client'
import { get, post } from '@core/api/http'
import type {
  AddParticipantsResult,
  StudentCandidate,
} from '../types/participant-management.types'

export const enrollmentService = {
  /** Students that can be added; those already in the class have `alreadyInClass: true`. */
  searchCandidates: (classId: string, search: string): Promise<StudentCandidate[]> =>
    get(`/api/classes/${classId}/participants/candidates`, {
      search: search.trim() || undefined,
    }),

  addParticipants: (classId: string, studentIds: string[]): Promise<AddParticipantsResult> =>
    post(`/api/classes/${classId}/participants/bulk`, { studentIds }),

  removeParticipant: async (classId: string, studentId: string): Promise<void> => {
    await apiClient.delete(`/api/classes/${classId}/participants/${studentId}`)
  },
}