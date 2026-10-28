import { post } from '@core/api/http'
import { USE_MOCK } from '@core/config/env'
import type { Section } from '../types/courses.types'

// Mock mode only echoes a new empty section; the editor keeps it in its draft and persists it on "Save changes".
const createMockSection = (classId: string, title: string): Promise<Section> =>
  Promise.resolve({
    id: crypto.randomUUID(),
    classId,
    title,
    orderIndex: 0,
    items: [],
  })

export const sectionService = {
  /** Appends an empty section to the class (lecturer only). */
  create: (classId: string, title: string): Promise<Section> =>
    USE_MOCK
      ? createMockSection(classId, title)
      : post<Section>(`/api/classes/${classId}/sections`, { title }),
}
