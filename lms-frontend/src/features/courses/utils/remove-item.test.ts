import { describe, expect, it } from 'vitest'
import type { Section, SectionItem } from '../types/courses.types'
import { removeItem } from './remove-item'

const buildItem = (id: string, sectionId: string): SectionItem => ({
  id,
  sectionId,
  itemType: 'DOCUMENT',
  title: id,
  externalUrl: null,
  orderIndex: 1,
  documentId: `doc-${id}`,
  assignmentId: null,
  isCompleted: false,
})

const buildSection = (id: string, itemIds: string[]): Section => ({
  id,
  classId: 'cls-1',
  title: id,
  description: null,
  orderIndex: 1,
  items: itemIds.map((itemId) => buildItem(itemId, id)),
})

describe('removeItem', () => {
  it('should remove only the chosen item and keep the order of the rest', () => {
    const sections = [buildSection('s1', ['a', 'b', 'c'])]

    const actualSections = removeItem(sections, 's1', 'b')

    expect(actualSections[0].items.map((item) => item.id)).toEqual(['a', 'c'])
  })

  it('should not touch other sections even when they share an item id', () => {
    const sections = [buildSection('s1', ['a']), buildSection('s2', ['a'])]

    const actualSections = removeItem(sections, 's1', 'a')

    expect(actualSections[0].items).toEqual([])
    expect(actualSections[1].items).toHaveLength(1)
  })

  it('should not mutate the input', () => {
    const sections = [buildSection('s1', ['a'])]

    removeItem(sections, 's1', 'a')

    expect(sections[0].items).toHaveLength(1)
  })

  it('should return equal sections when the item does not exist', () => {
    const sections = [buildSection('s1', ['a'])]

    expect(removeItem(sections, 's1', 'missing')).toEqual(sections)
  })
})
