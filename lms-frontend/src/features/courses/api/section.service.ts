import { del, patch, post, put } from '@core/api/http'
import { USE_MOCK } from '@core/config/env'
import { delay, mockSections } from '@core/mocks'
import type { ItemType, Section, SectionItem } from '../types/courses.types'

/** Fields of a section that can be saved one by one. */
export interface SectionPatch {
  title?: string
  description?: string | null
  isVisible?: boolean
}

/** Fields of an item that can be saved one by one. */
export interface ItemPatch {
  title?: string
  externalUrl?: string | null
  isVisible?: boolean
}

/** A new item; the client picks the id so the UI never waits for the server. */
export interface NewItemInput {
  id: string
  itemType: ItemType
  title: string
  externalUrl?: string | null
  documentId?: string | null
  assignmentId?: string | null
  examId?: string | null
}

const base = (classId: string) => `/api/classes/${classId}/sections`

// ----- mock mode: the same operations on the in-memory list -----

const mockSection = (sectionId: string): Section => {
  const section = mockSections.find((s) => s.id === sectionId)
  if (!section) throw new Error('Section not found')
  return section
}

const mockOrder = <T extends { id: string; orderIndex: number }>(list: T[], ids: string[]) => {
  const first = ids.flatMap((id) => list.find((x) => x.id === id) ?? [])
  const rest = list.filter((x) => !ids.includes(x.id))
  const ordered = [...first, ...rest]
  list.splice(0, list.length, ...ordered.map((x, i) => ({ ...x, orderIndex: i + 1 })))
}

/** Applies `change` to the mock data and answers like the server: the class's fresh sections. */
const mockApply = (classId: string, change: () => void): Promise<Section[]> => {
  change()
  return delay(structuredClone(mockSections.filter((s) => s.classId === classId)), 200)
}

export const sectionService = {
  /** Appends an empty section to the class (lecturer only). */
  create: (classId: string, title: string): Promise<Section> => {
    if (!USE_MOCK) return post<Section>(base(classId), { title })
    const last = Math.max(0, ...mockSections.filter((s) => s.classId === classId).map((s) => s.orderIndex))
    const section: Section = {
      id: crypto.randomUUID(),
      classId,
      title,
      description: null,
      orderIndex: last + 1,
      isVisible: true,
      items: [],
    }
    mockSections.push(section)
    return Promise.resolve(structuredClone(section))
  },

  update: (classId: string, sectionId: string, body: SectionPatch): Promise<Section[]> =>
    USE_MOCK
      ? mockApply(classId, () => Object.assign(mockSection(sectionId), body))
      : patch<Section[]>(`${base(classId)}/${sectionId}`, body),

  remove: (classId: string, sectionId: string): Promise<Section[]> =>
    USE_MOCK
      ? mockApply(classId, () => {
          const index = mockSections.findIndex((s) => s.id === sectionId)
          if (index >= 0) mockSections.splice(index, 1)
        })
      : del<Section[]>(`${base(classId)}/${sectionId}`),

  reorder: (classId: string, ids: string[]): Promise<Section[]> =>
    USE_MOCK
      ? mockApply(classId, () => mockOrder(mockSections, ids))
      : put<Section[]>(`${base(classId)}/order`, { ids }),

  createItem: (classId: string, sectionId: string, item: NewItemInput): Promise<Section[]> =>
    USE_MOCK
      ? mockApply(classId, () => {
          const section = mockSection(sectionId)
          const created: SectionItem = {
            externalUrl: null,
            documentId: null,
            assignmentId: null,
            examId: null,
            ...item,
            sectionId,
            orderIndex: section.items.length + 1,
            isCompleted: false,
            isVisible: true,
          }
          section.items.push(created)
        })
      : post<Section[]>(`${base(classId)}/${sectionId}/items`, item),

  updateItem: (classId: string, sectionId: string, itemId: string, body: ItemPatch): Promise<Section[]> =>
    USE_MOCK
      ? mockApply(classId, () => {
          const item = mockSection(sectionId).items.find((i) => i.id === itemId)
          if (item) Object.assign(item, body)
        })
      : patch<Section[]>(`${base(classId)}/${sectionId}/items/${itemId}`, body),

  removeItem: (classId: string, sectionId: string, itemId: string): Promise<Section[]> =>
    USE_MOCK
      ? mockApply(classId, () => {
          const section = mockSection(sectionId)
          section.items = section.items.filter((i) => i.id !== itemId)
        })
      : del<Section[]>(`${base(classId)}/${sectionId}/items/${itemId}`),

  reorderItems: (classId: string, sectionId: string, ids: string[]): Promise<Section[]> =>
    USE_MOCK
      ? mockApply(classId, () => mockOrder(mockSection(sectionId).items, ids))
      : put<Section[]>(`${base(classId)}/${sectionId}/items/order`, { ids }),

  /** Student: marks an item as done (true) or takes the mark back (false). */
  setCompletion: (
    classId: string,
    itemId: string,
    completed: boolean,
  ): Promise<{ itemId: string; isCompleted: boolean }> => {
    if (!USE_MOCK) {
      return put<{ itemId: string; isCompleted: boolean }>(
        `${base(classId)}/items/${itemId}/completion`,
        { completed },
      )
    }
    for (const section of mockSections) {
      const item = section.items.find((i) => i.id === itemId)
      if (item) item.isCompleted = completed
    }
    return delay({ itemId, isCompleted: completed }, 150)
  },
}