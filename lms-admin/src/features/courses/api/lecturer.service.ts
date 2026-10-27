import { get } from '@/core/api/http';
import type { PaginatedResult } from '@/core/types/pagination.types';
import type { LecturerView } from '../types/courses.types';

/** Largest page the backend allows. */
const PAGE_SIZE = 100;
/** Safety net against a runaway loop (2,000 lecturers). */
const MAX_PAGES = 20;

export const lecturerService = {
  /**
   * Lecturers who can be given a class, for the class form's dropdown (admin only): active accounts
   * whose status is WORKING, so lecturers on leave or resigned are not offered. Lecturers an admin
   * created in advance and who have not signed in yet are included on purpose, so classes can be
   * assigned before their first login. All pages are fetched, so a large faculty is not cut off.
   */
  getLecturers: async (): Promise<LecturerView[]> => {
    const lecturers: LecturerView[] = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      // Pages depend on each other's `totalPages`, so they are fetched one after another.
      // eslint-disable-next-line no-await-in-loop
      const result = await get<PaginatedResult<LecturerView>>('/api/users', {
        role: 'LECTURER',
        isActive: true,
        status: 'WORKING',
        sort: 'fullName',
        page,
        limit: PAGE_SIZE,
      });
      lecturers.push(
        ...result.items.map(({ id, fullName, email }) => ({ id, fullName, email })),
      );
      if (page >= result.totalPages) break;
    }
    return lecturers;
  },
};
