import { USE_MOCK } from '@core/config/env';
import { mockSections, delay } from '@core/mocks';
import type { ClassRoom, Section } from '../types/courses.types';
import { get, post } from '@core/api/http';
import { toSectionsPayload } from '../utils/section-payload';

export const classService = {
  // ----- shared: backend resolves role from JWT -----
  /** Classes for the signed-in user (student → enrolled, lecturer → teaching). */
  getMyClasses: (): Promise<ClassRoom[]> => get('/api/classes/my'),

  getClassById: (id: string): Promise<ClassRoom | undefined> =>
    get(`/api/classes/${id}`),

  getSections: (classId: string): Promise<Section[]> =>
    USE_MOCK
      ? delay(mockSections.filter((s) => s.classId === classId))
      : get(`/api/classes/${classId}/sections`),

  // ----- lecturer: re-uses the same my-classes endpoint -----
  getLecturerClasses: (): Promise<ClassRoom[]> => get('/api/classes/my'),

  saveSections: (classId: string, sections: Section[]): Promise<Section[]> => {
    if (!USE_MOCK)
      return post(`/api/classes/${classId}/sections/bulk`, {
        sections: toSectionsPayload(sections),
      });
    const others = mockSections.filter((s) => s.classId !== classId);
    mockSections.splice(
      0,
      mockSections.length,
      ...others,
      ...structuredClone(sections),
    );
    return delay(sections, 500);
  },
};
