import { get } from '@/core/api/http';
import type { SemesterView } from '../types/courses.types';

export const semesterService = {
  getSemesters: (): Promise<SemesterView[]> =>
    get<SemesterView[]>('/api/semesters'),
};
