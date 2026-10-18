import { get } from '@/core/api/http';
import type { LecturerView } from '../types/courses.types';

export const lecturerService = {
  /** Active lecturers for the class form's dropdown. Admin only. */
  getLecturers: (): Promise<LecturerView[]> =>
    get<LecturerView[]>('/api/users', { role: 'LECTURER' }),
};
