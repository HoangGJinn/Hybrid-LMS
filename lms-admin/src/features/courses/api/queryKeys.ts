import type { ClassFilters } from '../types/courses.types';

export const courseKeys = {
  all: ['courses'] as const,
  classes: () => [...courseKeys.all, 'classes'] as const,
  classList: (filters: ClassFilters) =>
    [...courseKeys.classes(), filters] as const,
  subjects: () => [...courseKeys.all, 'subjects'] as const,
  semesters: () => [...courseKeys.all, 'semesters'] as const,
  lecturers: () => [...courseKeys.all, 'lecturers'] as const,
    classStudents: (classId: string) =>
    [...courseKeys.all, 'class-students', classId] as const,
  availableStudents: (classId: string, search = '') =>
    [...courseKeys.classStudents(classId), 'available', search] as const,
};
