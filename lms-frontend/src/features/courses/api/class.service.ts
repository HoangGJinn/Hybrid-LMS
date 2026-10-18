import { USE_MOCK } from '@core/config/env';
import { mockClasses, mockSections, delay } from '@core/mocks';
import type { ClassRoom, Section } from '../types/courses.types';
import { get, post } from '@core/api/http';

export const classService = {
  // ----- shared / student -----
  getMyClasses: (): Promise<ClassRoom[]> =>
    USE_MOCK ? delay(mockClasses) : get('/api/classes/me'),
  getClassById: (id: string): Promise<ClassRoom | undefined> =>
    USE_MOCK
      ? delay(mockClasses.find((c) => c.id === id))
      : get(`/api/classes/${id}`),
  getSections: (classId: string): Promise<Section[]> =>
    USE_MOCK
      ? delay(mockSections.filter((s) => s.classId === classId))
      : get(`/api/classes/${classId}/sections`),

  // ----- lecturer -----
  getLecturerClasses: (lecturerId: string): Promise<ClassRoom[]> =>
    USE_MOCK
      ? delay(mockClasses.filter((c) => c.lecturerId === lecturerId))
      : get('/api/lecturer/classes'),

  saveSections: (classId: string, sections: Section[]): Promise<Section[]> => {
    if (!USE_MOCK)
      return post(`/api/classes/${classId}/sections/bulk`, { sections });
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
