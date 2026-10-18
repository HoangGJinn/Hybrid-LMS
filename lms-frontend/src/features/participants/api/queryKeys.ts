export const participantKeys = {
  classmates: (courseId: string) => ['course', courseId, 'classmates'] as const,
  roster: (classId: string) => ['classes', classId, 'roster'] as const,
};
