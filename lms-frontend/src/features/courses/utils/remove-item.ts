import type { Section } from '../types/courses.types'

/** Returns the sections without the given item; the other sections and items keep their order. */
export const removeItem = (
  sections: Section[],
  sectionId: string,
  itemId: string,
): Section[] =>
  sections.map((section) =>
    section.id === sectionId
      ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
      : section,
  )
