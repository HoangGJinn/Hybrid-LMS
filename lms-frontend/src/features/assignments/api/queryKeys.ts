export const assignmentKeys = {
  all: ['assignments'] as const,
  mine: ['assignments', 'me'] as const,
  detail: (assignmentId: string) => ['assignments', 'detail', assignmentId] as const,
  submissions: (assignmentId: string) => ['assignments', 'submissions', assignmentId] as const,
  mySubmissions: ['assignments', 'my-submissions'] as const,
}
