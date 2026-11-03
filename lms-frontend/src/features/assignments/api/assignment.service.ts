import { USE_MOCK } from '@core/config/env';
import { mockAssignments, mockSubmissions, delay } from '@core/mocks';
import { del, get, post, put } from '@core/api/http';
import { uploadFileToS3 } from '@core/api/s3-upload';
import { resolveContentType } from '@features/documents';
import type {
  Assignment,
  AssignmentDetail,
  AssignmentSubmission,
  MySubmission,
  NewAssignmentInput,
  SubmissionInput,
} from '../types/assignments.types';

const MOCK_STUDENT_ID = 'stu-001';

const mockFileLinks = (submission: AssignmentSubmission) =>
  submission.fileNames.map((fileName, index) => ({
    fileId: `${submission.id}-${index}`,
    fileName,
    contentType: '',
    size: 0,
    downloadUrl: '#',
  }));

const toMockMySubmission = (
  submission: AssignmentSubmission,
): MySubmission => ({
  id: submission.id,
  submittedAt: submission.submittedAt,
  score: submission.score,
  comment: submission.comment,
  files: mockFileLinks(submission),
});

const toMockDetail = (assignment: Assignment): AssignmentDetail => {
  const mine = mockSubmissions.find(
    (s) =>
      s.assignmentId === assignment.id && s.submittedBy === MOCK_STUDENT_ID,
  );
  return {
    ...assignment,
    files: [],
    mySubmission: mine ? toMockMySubmission(mine) : null,
    submissionCount: mockSubmissions.filter(
      (s) => s.assignmentId === assignment.id,
    ).length,
  };
};

export const assignmentService = {
  getMyAssignments: (): Promise<Assignment[]> =>
    USE_MOCK ? delay(mockAssignments) : get('/api/assignments/me'),
  getAssignment: (id: string): Promise<Assignment | undefined> =>
    USE_MOCK
      ? delay(mockAssignments.find((a) => a.id === id))
      : get(`/api/assignments/${id}`),
  /** One assignment with its files and the student's own submission. Links in it expire after a few minutes. */
  getDetail: (
    classId: string,
    assignmentId: string,
  ): Promise<AssignmentDetail | undefined> => {
    if (!USE_MOCK)
      return get(`/api/classes/${classId}/assignments/${assignmentId}`);
    const assignment = mockAssignments.find((a) => a.id === assignmentId);
    return delay(assignment ? toMockDetail(assignment) : undefined);
  },
  /** UC-33: uploads the attachments to S3, then creates the assignment. */
  create: async (
    classId: string,
    input: NewAssignmentInput,
  ): Promise<AssignmentDetail> => {
    if (USE_MOCK) {
      const assignment: Assignment = {
        id: crypto.randomUUID(),
        classId,
        title: input.title,
        instruction: input.instruction,
        openAt: input.openAt,
        endAt: input.endAt,
        status: 'OPEN',
      };
      mockAssignments.push(assignment);
      return delay(toMockDetail(assignment));
    }
    const fileIds = await Promise.all(
      input.files.map((file) =>
        uploadFileToS3(file, {
          purpose: 'ASSIGNMENT',
          contentType: resolveContentType(file),
        }),
      ),
    );
    return post(`/api/classes/${classId}/assignments`, {
      title: input.title,
      instruction: input.instruction,
      openAt: input.openAt,
      endAt: input.endAt,
      fileIds,
    });
  },
  /** UC-34: removes the assignment (and, when nobody submitted, its files) from the class. */
  remove: (classId: string, assignmentId: string): Promise<void> =>
    USE_MOCK
      ? delay(undefined)
      : del(`/api/classes/${classId}/assignments/${assignmentId}`),
  /** UC-16 / UC-17: uploads the new files to S3, then hands in (or replaces) the student's submission. */
  submit: async (
    classId: string,
    assignmentId: string,
    input: SubmissionInput,
  ): Promise<MySubmission> => {
    if (!USE_MOCK) {
      const newFileIds = await Promise.all(
        input.newFiles.map((file) =>
          uploadFileToS3(file, {
            purpose: 'SUBMISSION',
            contentType: resolveContentType(file),
            assignmentId,
          }),
        ),
      );
      return put(
        `/api/classes/${classId}/assignments/${assignmentId}/submission`,
        { fileIds: [...input.keptFileIds, ...newFileIds] },
      );
    }
    const previous = mockSubmissions.find(
      (s) =>
        s.assignmentId === assignmentId && s.submittedBy === MOCK_STUDENT_ID,
    );
    const keptNames = previous
      ? mockFileLinks(previous)
          .filter((file) => input.keptFileIds.includes(file.fileId))
          .map((file) => file.fileName)
      : [];
    const submission: AssignmentSubmission = {
      id: previous?.id ?? crypto.randomUUID(),
      assignmentId,
      submittedBy: MOCK_STUDENT_ID,
      studentName: 'Nguyen Van A',
      score: previous?.score ?? null,
      comment: previous?.comment ?? null,
      submittedAt: new Date().toISOString(),
      fileNames: [...keptNames, ...input.newFiles.map((file) => file.name)],
    };
    // Replace in place (new object, same slot) so a refetch returns the new submission and Query re-renders.
    const index = mockSubmissions.findIndex((s) => s.id === submission.id);
    if (index >= 0) mockSubmissions.splice(index, 1, submission);
    else mockSubmissions.push(submission);
    return delay(toMockMySubmission(submission));
  },
  getSubmissions: (assignmentId?: string): Promise<AssignmentSubmission[]> =>
    USE_MOCK
      ? delay(
          assignmentId
            ? mockSubmissions.filter((s) => s.assignmentId === assignmentId)
            : mockSubmissions,
        )
      : get('/api/submissions', { assignmentId }),
  /** Submissions of the signed-in student across all classes. */
  getMySubmissions: (): Promise<AssignmentSubmission[]> =>
    USE_MOCK
      ? delay(mockSubmissions.filter((s) => s.submittedBy === MOCK_STUDENT_ID))
      : get('/api/submissions/me'),
};