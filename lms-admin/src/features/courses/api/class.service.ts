import { get, patch, post } from '@/core/api/http';
import type {
  ClassFilters,
  ClassView,
  CreateClassPayload,
  UpdateClassPayload,
} from '../types/courses.types';

const byClassCode = (a: ClassView, b: ClassView) =>
  a.classCode.localeCompare(b.classCode);

export const classService = {
  /**
   * GET /api/classes returns the full list (no server paging) and only active classes unless
   * `isActive` is given, so "all statuses" is two requests merged client-side.
   */
  getClasses: async ({
    status,
    semesterId,
    search,
  }: ClassFilters): Promise<ClassView[]> => {
    const base = {
      semesterId: semesterId || undefined,
      search: search.trim() || undefined,
    };
    if (status === 'all') {
      const [active, ended] = await Promise.all([
        get<ClassView[]>('/api/classes', { ...base, isActive: true }),
        get<ClassView[]>('/api/classes', { ...base, isActive: false }),
      ]);
      return [...active, ...ended].sort(byClassCode);
    }
    return get<ClassView[]>('/api/classes', {
      ...base,
      isActive: status === 'active',
    });
  },

  createClass: (payload: CreateClassPayload): Promise<ClassView> =>
    post<ClassView>('/api/classes', payload),

  updateClass: (id: string, payload: UpdateClassPayload): Promise<ClassView> =>
    patch<ClassView>(`/api/classes/${id}`, payload),

  /** Classes are never deleted: this sets `isActive=false` and `endedAt=now`. */
  deactivateClass: (id: string): Promise<ClassView> =>
    patch<ClassView>(`/api/classes/${id}/deactivate`),
};
