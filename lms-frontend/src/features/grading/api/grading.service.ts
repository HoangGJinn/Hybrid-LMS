import { USE_MOCK } from '@core/config/env';
import { get, put } from '@core/api/http';
import { delay, mockAssignments, mockSubmissions } from '@core/mocks';
import type { AssignmentSubmission } from '@features/assignments';
import type { LecturerExamAttemptItem } from '@features/exams';
import type {
  PendingExamSubmission,
  PendingSubmission,
} from '../types/grading.types';

/** Mock submissions only store file names; the queue shows links, so build them on the way out. */
const withMockFiles = (
  submission: AssignmentSubmission,
): AssignmentSubmission => ({
  ...submission,
  files: submission.fileNames.map((fileName, index) => ({
    fileId: `${submission.id}-${index}`,
    fileName,
    contentType: '',
    size: 0,
    downloadUrl: '#',
  })),
});

export const gradingService = {
  getPendingSubmissions: (classIds: string[]): Promise<PendingSubmission[]> => {
    if (classIds.length === 0) return Promise.resolve([]);
    if (!USE_MOCK)
      return get('/api/lecturer/submissions', { classIds: classIds.join(',') });
    const list = mockSubmissions
      .map((s) => ({
        ...withMockFiles(s),
        assignment: mockAssignments.find((a) => a.id === s.assignmentId)!,
      }))
      .filter((s) => s.assignment && classIds.includes(s.assignment.classId));
    return delay(list);
  },

  getPendingExamSubmissions: (
    classIds: string[],
  ): Promise<PendingExamSubmission[]> => {
    if (classIds.length === 0) return Promise.resolve([]);
    if (!USE_MOCK)
      return get('/api/lecturer/exam-submissions', {
        classIds: classIds.join(','),
      });
    return delay([]);
  },

  /** Grades a submission through its class and assignment; grading again overwrites the previous grade. */
  grade: (
    submission: PendingSubmission,
    score: number,
    comment: string,
  ): Promise<AssignmentSubmission> => {
    if (!USE_MOCK)
      return put(
        `/api/classes/${submission.assignment.classId}/assignments/${submission.assignmentId}/submissions/${submission.id}/grade`,
        { score, comment },
      );
    const index = mockSubmissions.findIndex((x) => x.id === submission.id);
    // Replace instead of mutating so cached copies of the submission are not silently changed.
    const graded: AssignmentSubmission = {
      ...mockSubmissions[index],
      score,
      comment,
    };
    mockSubmissions[index] = graded;
    return delay({ ...graded }, 500);
  },

  /** Grades a FILE exam session through its class and exam; grading again overwrites the previous grade. */
  gradeExamSession: (
    classId: string,
    examId: string,
    sessionId: string,
    score: number,
    comment: string,
  ): Promise<LecturerExamAttemptItem> =>
    put(`/api/classes/${classId}/exams/${examId}/sessions/${sessionId}/grade`, {
      score,
      comment: comment || null,
    }),
};
