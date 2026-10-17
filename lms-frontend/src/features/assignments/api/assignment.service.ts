import { USE_MOCK } from '@core/config/env'
import { mockAssignments, mockSubmissions, delay } from '@core/mocks'
import type { Assignment, AssignmentSubmission } from '../types/assignments.types'
import { get, post } from '@core/api/http'

const MOCK_STUDENT_ID = 'stu-001'

export const assignmentService = {
  getMyAssignments: (): Promise<Assignment[]> => (USE_MOCK ? delay(mockAssignments) : get('/api/assignments/me')),
  getAssignment: (id: string): Promise<Assignment | undefined> =>
    USE_MOCK ? delay(mockAssignments.find((a) => a.id === id)) : get(`/api/assignments/${id}`),
  submit: (assignmentId: string, fileNames: string[]): Promise<AssignmentSubmission> => {
    if (!USE_MOCK) return post(`/api/assignments/${assignmentId}/submissions`, { fileNames })
    const submission: AssignmentSubmission = {
      id: crypto.randomUUID(),
      assignmentId,
      submittedBy: MOCK_STUDENT_ID,
      studentName: 'Nguyen Van A',
      score: null,
      comment: null,
      submittedAt: new Date().toISOString(),
      fileNames,
    }
    // Replace in place (new object, same slot) so a refetch returns the new submission and Query re-renders.
    const index = mockSubmissions.findIndex((s) => s.assignmentId === assignmentId && s.submittedBy === MOCK_STUDENT_ID)
    if (index >= 0) mockSubmissions.splice(index, 1, submission)
    else mockSubmissions.push(submission)
    return delay({ ...submission })
  },
  getSubmissions: (assignmentId?: string): Promise<AssignmentSubmission[]> =>
    USE_MOCK
      ? delay(assignmentId ? mockSubmissions.filter((s) => s.assignmentId === assignmentId) : mockSubmissions)
      : get('/api/submissions', { assignmentId }),
  /** Submissions of the signed-in student across all classes. */
  getMySubmissions: (): Promise<AssignmentSubmission[]> =>
    USE_MOCK ? delay(mockSubmissions.filter((s) => s.submittedBy === MOCK_STUDENT_ID)) : get('/api/submissions/me'),
}
