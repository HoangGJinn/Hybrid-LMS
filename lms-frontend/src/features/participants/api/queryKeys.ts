export const participantKeys = {
  all: ['participants'] as const,
  classmates: (classId: string) =>
    [...participantKeys.all, 'classmates', classId] as const,
  roster: (classId: string) =>
    [...participantKeys.all, 'roster', classId] as const,
  candidatesAll: (classId: string) =>
    [...participantKeys.all, 'candidates', classId] as const,
  candidates: (classId: string, search: string) =>
    [...participantKeys.candidatesAll(classId), search] as const,
};

// export const participantKeys = {
//   classmates: (courseId: string) => ['course', courseId, 'classmates'] as const,
//   roster: (classId: string) => ['classes', classId, 'roster'] as const,
// };
