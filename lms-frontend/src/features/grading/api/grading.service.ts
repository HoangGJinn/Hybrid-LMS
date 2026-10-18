import { USE_MOCK } from '@core/config/env';
import { mockAssignments, mockSubmissions, delay } from '@core/mocks';
import type { AssignmentSubmission } from '@features/assignments';
import type { PendingSubmission } from '../types/grading.types';
import { get, post } from '@core/api/http';

export const gradingService = {
  getPendingSubmissions: (classIds: string[]): Promise<PendingSubmission[]> => {
    if (classIds.length === 0) return Promise.resolve([]);
    if (!USE_MOCK)
      return get('/api/lecturer/submissions', { classIds: classIds.join(',') });
    const list = mockSubmissions
      .map((s) => ({
        ...s,
        assignment: mockAssignments.find((a) => a.id === s.assignmentId)!,
      }))
      .filter((s) => s.assignment && classIds.includes(s.assignment.classId));
    return delay(list);
  },

  grade: (
    submissionId: string,
    score: number,
    comment: string,
  ): Promise<AssignmentSubmission> => {
    if (!USE_MOCK)
      return post(`/api/submissions/${submissionId}/grade`, { score, comment });
    const index = mockSubmissions.findIndex((x) => x.id === submissionId);
    // Replace instead of mutating so cached copies of the submission are not silently changed.
    const graded: AssignmentSubmission = {
      ...mockSubmissions[index],
      score,
      comment,
    };
    mockSubmissions[index] = graded;
    return delay({ ...graded }, 500);
  },
};
