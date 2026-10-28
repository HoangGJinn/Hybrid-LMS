import type { ClassFilters } from '../types/courses.types';

export const courseKeys = {
  all: ['courses'] as const,
  classes: () => [...courseKeys.all, 'classes'] as const,
  classList: (filters: ClassFilters) =>
    [...courseKeys.classes(), filters] as const,
  detail: (classId: string) => [...courseKeys.all, 'class', classId] as const,
  /** Everything about the participants of one class: list and candidate searches. */
  participants: (classId: string) =>
    [...courseKeys.all, 'participants', classId] as const,
  participantList: (classId: string, search: string) =>
    [...courseKeys.participants(classId), 'list', search] as const,
  candidates: (classId: string, search: string) =>
    [...courseKeys.participants(classId), 'candidates', search] as const,
  subjects: () => [...courseKeys.all, 'subjects'] as const,
  semesters: () => [...courseKeys.all, 'semesters'] as const,
  lecturers: () => [...courseKeys.all, 'lecturers'] as const,
};
