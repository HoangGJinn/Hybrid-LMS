export const participantKeys = {
  all: ['participants'] as const,
  classmates: (classId: string) =>
    [...participantKeys.all, 'classmates', classId] as const,
  roster: (classId: string) =>
    [...participantKeys.all, 'roster', classId] as const,
  /** Participants of a class as managed by the lecturer (`/participants`). */
  list: (classId: string) =>
    [...participantKeys.all, 'list', classId] as const,
  candidatesAll: (classId: string) =>
    [...participantKeys.all, 'candidates', classId] as const,
  candidates: (classId: string, search: string) =>
    [...participantKeys.candidatesAll(classId), search] as const,
};
