export const assignmentKeys = {
  all: ['assignments'] as const,
  mine: ['assignments', 'me'] as const,
  detail: (assignmentId: string) =>
    ['assignments', 'detail', assignmentId] as const,
  /** One assignment as seen through its class (the real API is class-scoped). */
  inClass: (classId: string, assignmentId: string) =>
    ['assignments', 'class', classId, assignmentId] as const,
  submissions: (assignmentId: string) =>
    ['assignments', 'submissions', assignmentId] as const,
  mySubmissions: ['assignments', 'my-submissions'] as const,
};