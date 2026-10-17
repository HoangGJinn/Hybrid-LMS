import { USE_MOCK } from '@core/config/env'
import { mockRoster, delay } from '@core/mocks'
import type { Classmate, RosterStudent } from '../types/participants.types'
import { get } from '@core/api/http'

export const participantService = {
  /** Public roster only (no scores or mastery), safe to show to other students. */
  getClassmates: (classId: string): Promise<Classmate[]> =>
    USE_MOCK
      ? delay(mockRoster.filter((s) => s.classId === classId).map(({ id, classId: cid, studentCode, fullName, email }) => ({ id, classId: cid, studentCode, fullName, email })))
      : get(`/api/classes/${classId}/classmates`),

  /** Lecturer view: includes scores, mastery and at-risk flag. */
  getRoster: (classId: string): Promise<RosterStudent[]> =>
    USE_MOCK ? delay(mockRoster.filter((r) => r.classId === classId)) : get(`/api/classes/${classId}/students`),
}
