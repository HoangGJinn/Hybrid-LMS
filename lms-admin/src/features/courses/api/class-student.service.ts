import { apiClient } from '@/core/api/client';
import { get, post } from '@/core/api/http';
import type {
  AddStudentsResult,
  ClassStudent,
  StudentOption,
} from '../types/courses.types';

export const classStudentService = {
  getStudents: (classId: string): Promise<ClassStudent[]> =>
    get<ClassStudent[]>(`/api/classes/${classId}/students`),

    getAvailableStudents: (classId: string, search: string) =>
    get<StudentOption[]>(`/api/classes/${classId}/participants/candidates`, {
        search: search.trim() || undefined,
    }),

    addStudents: (classId: string, studentIds: string[]) =>
    post<AddStudentsResult>(`/api/classes/${classId}/participants`, { studentIds }),
    
    removeStudent: async (classId: string, studentId: string) => {
    await apiClient.delete(`/api/classes/${classId}/participants/${studentId}`)
    },
};