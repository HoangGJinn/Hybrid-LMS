/** Query keys of the courses feature. `['course', id, ...]` is the shared prefix for everything scoped to one course. */
export const courseKeys = {
  all: ['classes'] as const,
  mine: ['classes', 'me'] as const,
  lecturer: (lecturerId: string) => ['classes', 'lecturer', lecturerId] as const,
  detail: (courseId: string) => ['course', courseId] as const,
  sections: (courseId: string) => ['course', courseId, 'sections'] as const,
}
