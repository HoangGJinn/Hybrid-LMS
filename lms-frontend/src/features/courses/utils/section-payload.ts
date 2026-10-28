import type { Section } from '../types/courses.types'

/** Maps the editor's sections to the body expected by POST /api/classes/:classId/sections/bulk. */
export const toSectionsPayload = (sections: Section[]) =>
  sections.map((section, sectionIndex) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    orderIndex: sectionIndex,
    items: section.items.map((item, itemIndex) => ({
      id: item.id,
      itemType: item.itemType,
      title: item.title,
      externalUrl: item.externalUrl,
      documentId: item.documentId,
      assignmentId: item.assignmentId,
      orderIndex: itemIndex,
    })),
  }))