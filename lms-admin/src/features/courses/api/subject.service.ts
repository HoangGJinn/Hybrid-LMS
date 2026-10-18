import { get } from '@/core/api/http';
import type { SubjectView } from '../types/courses.types';

export const subjectService = {
  getSubjects: (): Promise<SubjectView[]> => get<SubjectView[]>('/api/subjects'),
};
