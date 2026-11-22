import { beforeEach, describe, expect, it, vi } from 'vitest'
import { In, IsNull, Not, Repository } from 'typeorm'
import type { SaveSectionDto } from '../dto/save-section.dto.js'
import { ItemCompletion } from '../entities/item-completion.entity.js'
import { SectionItem } from '../entities/section-item.entity.js'
import { Section } from '../entities/section.entity.js'
import { ItemType } from '../enums/item-type.enum.js'
import { SectionRepository } from './section.repository.js'
import type { NewItem } from './section.repository.js'

type Mock = ReturnType<typeof vi.fn>
type Builder = Record<string, Mock>

function createBuilder(chain: string[], terminals: string[]): Builder {
  const builder: Builder = {}
  for (const name of chain) builder[name] = vi.fn().mockReturnValue(builder)
  for (const name of terminals) builder[name] = vi.fn()
  return builder
}

const sectionsPayload = [
  {
    id: 'sec-1',
    title: 'Week 1',
    orderIndex: 1,
    items: [
      {
        id: 'item-1',
        itemType: 'LINK',
        title: 'Slides',
        externalUrl: 'https://example.com',
        orderIndex: 1,
      },
      {
        id: 'item-2',
        itemType: 'DOCUMENT',
        title: 'Notes',
        orderIndex: 2,
        documentId: 'doc-1',
      },
    ],
  },
  { id: 'sec-2', title: 'Week 2', orderIndex: 2, items: [] },
] as unknown as SaveSectionDto[]

describe('SectionRepository', () => {
  let sectionOrm: {
    find: Mock
    findOne: Mock
    update: Mock
    delete: Mock
    manager: { transaction: Mock }
  }
  let itemOrm: {
    find: Mock
    findOne: Mock
    exists: Mock
    count: Mock
    update: Mock
    delete: Mock
    createQueryBuilder: Mock
    manager: { transaction: Mock }
  }
  let completionOrm: { find: Mock; exists: Mock; insert: Mock; delete: Mock }
  let itemQuery: Builder
  let maxQuery: Builder
  let deleteQuery: Builder
  let txManager: {
    getRepository: Mock
    create: Mock
    save: Mock
    update: Mock
    createQueryBuilder: Mock
    upsert: Mock
  }
  let repository: SectionRepository

  beforeEach(() => {
    itemQuery = createBuilder(['innerJoin', 'select', 'where', 'andWhere'], ['getRawMany'])
    maxQuery = createBuilder(['select', 'where'], ['getRawOne'])
    deleteQuery = createBuilder(['delete', 'from', 'where', 'andWhere'], ['execute'])
    txManager = {
      getRepository: vi.fn().mockReturnValue({
        createQueryBuilder: vi.fn().mockReturnValue(maxQuery),
      }),
      create: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue(deleteQuery),
      upsert: vi.fn(),
    }
    const transaction = vi.fn((callback: (manager: unknown) => Promise<unknown>) =>
      callback(txManager),
    )
    sectionOrm = {
      find: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      manager: { transaction },
    }
    itemOrm = {
      find: vi.fn(),
      findOne: vi.fn(),
      exists: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue(itemQuery),
      manager: { transaction },
    }
    completionOrm = {
      find: vi.fn(),
      exists: vi.fn(),
      insert: vi.fn(),
      delete: vi.fn(),
    }
    repository = new SectionRepository(
      sectionOrm as unknown as Repository<Section>,
      itemOrm as unknown as Repository<SectionItem>,
      completionOrm as unknown as Repository<ItemCompletion>,
    )
  })

  describe('findByClassId', () => {
    it('lists sections in display order', async () => {
      const rows = [{ id: 'sec-1' }]
      sectionOrm.find.mockResolvedValue(rows)

      await expect(repository.findByClassId('class-1')).resolves.toBe(rows)
      expect(sectionOrm.find).toHaveBeenCalledWith({
        where: { classId: 'class-1' },
        order: { orderIndex: 'ASC' },
      })
    })
  })

  describe('findItemsBySectionIds', () => {
    it('returns an empty list without querying when no sections', async () => {
      await expect(repository.findItemsBySectionIds([])).resolves.toEqual([])
      expect(itemOrm.find).not.toHaveBeenCalled()
    })

    it('loads the non-deleted items of the given sections in display order', async () => {
      const rows = [{ id: 'item-1' }]
      itemOrm.find.mockResolvedValue(rows)

      await expect(repository.findItemsBySectionIds(['sec-1'])).resolves.toBe(rows)
      expect(itemOrm.find).toHaveBeenCalledWith({
        where: { sectionId: In(['sec-1']), deletedAt: IsNull() },
        order: { orderIndex: 'ASC' },
      })
    })
  })

  describe('findIdsOwnedByOtherClasses', () => {
    it('returns an empty list without querying when no ids are given', async () => {
      await expect(repository.findIdsOwnedByOtherClasses('class-1', [], [])).resolves.toEqual([])
      expect(sectionOrm.find).not.toHaveBeenCalled()
      expect(itemOrm.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('combines foreign section ids and foreign item ids', async () => {
      sectionOrm.find.mockResolvedValue([{ id: 'sec-x' }])
      itemQuery.getRawMany.mockResolvedValue([{ id: 'item-x' }])

      const result = await repository.findIdsOwnedByOtherClasses('class-1', ['sec-x'], ['item-x'])

      expect(result).toEqual(['sec-x', 'item-x'])
      expect(sectionOrm.find).toHaveBeenCalledWith({
        select: { id: true },
        where: { id: In(['sec-x']), classId: Not('class-1') },
      })
      expect(itemQuery.andWhere).toHaveBeenCalledWith('section.classId != :classId', {
        classId: 'class-1',
      })
    })

    it('checks only sections when there are no item ids', async () => {
      sectionOrm.find.mockResolvedValue([{ id: 'sec-x' }])

      const result = await repository.findIdsOwnedByOtherClasses('class-1', ['sec-x'], [])

      expect(result).toEqual(['sec-x'])
      expect(itemOrm.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('checks only items when there are no section ids', async () => {
      itemQuery.getRawMany.mockResolvedValue([{ id: 'item-x' }])

      const result = await repository.findIdsOwnedByOtherClasses('class-1', [], ['item-x'])

      expect(result).toEqual(['item-x'])
      expect(sectionOrm.find).not.toHaveBeenCalled()
    })
  })

  describe('createAtEnd', () => {
    it('appends after the highest order index', async () => {
      maxQuery.getRawOne.mockResolvedValue({ maxOrder: '3' })
      const entity = { id: 'new' }
      const saved = { id: 'new', orderIndex: 4 }
      txManager.create.mockReturnValue(entity)
      txManager.save.mockResolvedValue(saved)

      const result = await repository.createAtEnd('class-1', 'Week 4')

      expect(txManager.getRepository).toHaveBeenCalledWith(Section)
      expect(txManager.create).toHaveBeenCalledWith(Section, {
        classId: 'class-1',
        title: 'Week 4',
        orderIndex: 4,
      })
      expect(txManager.save).toHaveBeenCalledWith(entity)
      expect(result).toBe(saved)
    })

    it('starts at 1 when the class has no sections', async () => {
      maxQuery.getRawOne.mockResolvedValue(undefined)
      txManager.create.mockReturnValue({})
      txManager.save.mockResolvedValue({})

      await repository.createAtEnd('class-1', 'First')

      expect(txManager.create).toHaveBeenCalledWith(Section, {
        classId: 'class-1',
        title: 'First',
        orderIndex: 1,
      })
    })
  })

  describe('one-change-at-a-time lookups', () => {
    it('findSection only matches a section of the class', async () => {
      const row = { id: 'sec-1' }
      sectionOrm.findOne.mockResolvedValue(row)

      await expect(repository.findSection('class-1', 'sec-1')).resolves.toBe(row)
      expect(sectionOrm.findOne).toHaveBeenCalledWith({
        where: { id: 'sec-1', classId: 'class-1' },
      })
    })

    it('findSection returns null when the section is not of the class', async () => {
      sectionOrm.findOne.mockResolvedValue(null)

      await expect(repository.findSection('class-1', 'sec-x')).resolves.toBeNull()
    })

    it('findItem only matches a non-deleted item of the section', async () => {
      const row = { id: 'item-1' }
      itemOrm.findOne.mockResolvedValue(row)

      await expect(repository.findItem('sec-1', 'item-1')).resolves.toBe(row)
      expect(itemOrm.findOne).toHaveBeenCalledWith({
        where: { id: 'item-1', sectionId: 'sec-1', deletedAt: IsNull() },
      })
    })

    it('itemExists reports whether the item row exists (deleted or not)', async () => {
      itemOrm.exists.mockResolvedValue(true)

      await expect(repository.itemExists('item-1')).resolves.toBe(true)
      expect(itemOrm.exists).toHaveBeenCalledWith({ where: { id: 'item-1' } })
    })
  })

  describe('updateSection', () => {
    it('updates only the given section', async () => {
      await repository.updateSection('sec-1', { title: 'New', isVisible: false })

      expect(sectionOrm.update).toHaveBeenCalledWith(
        { id: 'sec-1' },
        { title: 'New', isVisible: false },
      )
    })

    it('does nothing for an empty patch', async () => {
      await repository.updateSection('sec-1', {})
      await repository.updateSection('sec-1', { title: undefined, description: undefined })

      expect(sectionOrm.update).not.toHaveBeenCalled()
    })

    it('still updates when a field is explicitly set to null', async () => {
      await repository.updateSection('sec-1', { description: null })

      expect(sectionOrm.update).toHaveBeenCalledWith({ id: 'sec-1' }, { description: null })
    })
  })

  describe('deleteSection', () => {
    it('deletes the section by id', async () => {
      await repository.deleteSection('sec-1')

      expect(sectionOrm.delete).toHaveBeenCalledWith({ id: 'sec-1' })
    })
  })

  describe('countLinkedItems', () => {
    it('counts every non-video item, soft-deleted ones included', async () => {
      itemOrm.count.mockResolvedValue(3)

      await expect(repository.countLinkedItems('sec-1')).resolves.toBe(3)
      expect(itemOrm.count).toHaveBeenCalledWith({
        where: { sectionId: 'sec-1', itemType: Not(ItemType.VIDEO) },
      })
    })
  })

  describe('setSectionOrder', () => {
    it('numbers the sections 1..n inside one transaction', async () => {
      await repository.setSectionOrder('class-1', ['b', 'a', 'c'])

      expect(sectionOrm.manager.transaction).toHaveBeenCalledTimes(1)
      expect(txManager.update).toHaveBeenCalledTimes(3)
      expect(txManager.update).toHaveBeenNthCalledWith(
        1,
        Section,
        { id: 'b', classId: 'class-1' },
        { orderIndex: 1 },
      )
      expect(txManager.update).toHaveBeenNthCalledWith(
        2,
        Section,
        { id: 'a', classId: 'class-1' },
        { orderIndex: 2 },
      )
      expect(txManager.update).toHaveBeenNthCalledWith(
        3,
        Section,
        { id: 'c', classId: 'class-1' },
        { orderIndex: 3 },
      )
    })

    it('opens a transaction but updates nothing for an empty list', async () => {
      await repository.setSectionOrder('class-1', [])

      expect(txManager.update).not.toHaveBeenCalled()
    })
  })

  describe('createItemAtEnd', () => {
    const newItem: NewItem = {
      id: 'item-new',
      itemType: ItemType.VIDEO,
      title: 'Intro video',
      externalUrl: 'https://example.com/v',
      documentId: null,
      assignmentId: null,
      examId: null,
    }

    it('appends after the highest order index of the section', async () => {
      maxQuery.getRawOne.mockResolvedValue({ maxOrder: 5 })
      const entity = { id: 'item-new' }
      const saved = { id: 'item-new', orderIndex: 6 }
      txManager.create.mockReturnValue(entity)
      txManager.save.mockResolvedValue(saved)

      const result = await repository.createItemAtEnd('sec-1', newItem)

      expect(txManager.getRepository).toHaveBeenCalledWith(SectionItem)
      expect(maxQuery.where).toHaveBeenCalledWith('item.sectionId = :sectionId', {
        sectionId: 'sec-1',
      })
      expect(txManager.create).toHaveBeenCalledWith(SectionItem, {
        ...newItem,
        sectionId: 'sec-1',
        orderIndex: 6,
      })
      expect(txManager.save).toHaveBeenCalledWith(entity)
      expect(result).toBe(saved)
    })

    it('starts at 1 when the section is empty', async () => {
      maxQuery.getRawOne.mockResolvedValue(undefined)
      txManager.create.mockReturnValue({})
      txManager.save.mockResolvedValue({})

      await repository.createItemAtEnd('sec-1', newItem)

      expect(txManager.create).toHaveBeenCalledWith(
        SectionItem,
        expect.objectContaining({ sectionId: 'sec-1', orderIndex: 1 }),
      )
    })
  })

  describe('updateItem', () => {
    it('updates only the given item', async () => {
      await repository.updateItem('item-1', { title: 'New', externalUrl: null })

      expect(itemOrm.update).toHaveBeenCalledWith(
        { id: 'item-1' },
        { title: 'New', externalUrl: null },
      )
    })

    it('does nothing for an empty patch', async () => {
      await repository.updateItem('item-1', {})
      await repository.updateItem('item-1', { title: undefined })

      expect(itemOrm.update).not.toHaveBeenCalled()
    })
  })

  describe('deleteItem', () => {
    it('deletes the item by id', async () => {
      await repository.deleteItem('item-1')

      expect(itemOrm.delete).toHaveBeenCalledWith({ id: 'item-1' })
    })
  })

  describe('setItemOrder', () => {
    it('numbers the items of the section 1..n inside one transaction', async () => {
      await repository.setItemOrder('sec-1', ['i2', 'i1'])

      expect(itemOrm.manager.transaction).toHaveBeenCalledTimes(1)
      expect(txManager.update).toHaveBeenNthCalledWith(
        1,
        SectionItem,
        { id: 'i2', sectionId: 'sec-1' },
        { orderIndex: 1 },
      )
      expect(txManager.update).toHaveBeenNthCalledWith(
        2,
        SectionItem,
        { id: 'i1', sectionId: 'sec-1' },
        { orderIndex: 2 },
      )
    })
  })

  describe('findCompletedItemIds', () => {
    it('returns an empty set without querying when no items are given', async () => {
      await expect(repository.findCompletedItemIds('stu-1', [])).resolves.toEqual(new Set())
      expect(completionOrm.find).not.toHaveBeenCalled()
    })

    it('returns the ids the student has completed', async () => {
      completionOrm.find.mockResolvedValue([
        { sectionItemId: 'item-1' },
        { sectionItemId: 'item-3' },
      ])

      const result = await repository.findCompletedItemIds('stu-1', ['item-1', 'item-2', 'item-3'])

      expect(result).toEqual(new Set(['item-1', 'item-3']))
      expect(completionOrm.find).toHaveBeenCalledWith({
        select: { sectionItemId: true },
        where: { studentId: 'stu-1', sectionItemId: In(['item-1', 'item-2', 'item-3']) },
      })
    })
  })

  describe('findItemInClass', () => {
    it('loads a non-deleted item with its section, scoped to the class', async () => {
      const row = { id: 'item-1', section: { id: 'sec-1' } }
      itemOrm.findOne.mockResolvedValue(row)

      await expect(repository.findItemInClass('class-1', 'item-1')).resolves.toBe(row)
      expect(itemOrm.findOne).toHaveBeenCalledWith({
        where: { id: 'item-1', deletedAt: IsNull(), section: { classId: 'class-1' } },
        relations: { section: true },
      })
    })

    it('returns null when the item is not in the class', async () => {
      itemOrm.findOne.mockResolvedValue(null)

      await expect(repository.findItemInClass('class-1', 'item-x')).resolves.toBeNull()
    })
  })

  describe('markCompleted', () => {
    it('inserts a completion with the current time', async () => {
      completionOrm.exists.mockResolvedValue(false)

      await repository.markCompleted('stu-1', 'item-1')

      expect(completionOrm.exists).toHaveBeenCalledWith({
        where: { studentId: 'stu-1', sectionItemId: 'item-1' },
      })
      expect(completionOrm.insert).toHaveBeenCalledWith({
        studentId: 'stu-1',
        sectionItemId: 'item-1',
        completedAt: expect.any(Date),
      })
    })

    it('is idempotent: does not insert when already completed', async () => {
      completionOrm.exists.mockResolvedValue(true)

      await repository.markCompleted('stu-1', 'item-1')

      expect(completionOrm.insert).not.toHaveBeenCalled()
    })
  })

  describe('unmarkCompleted', () => {
    it('deletes the completion of that student and item', async () => {
      await repository.unmarkCompleted('stu-1', 'item-1')

      expect(completionOrm.delete).toHaveBeenCalledWith({
        studentId: 'stu-1',
        sectionItemId: 'item-1',
      })
    })
  })

  describe('replaceAll (deprecated)', () => {
    it('deletes removed rows then upserts sections and items', async () => {
      await repository.replaceAll('class-1', sectionsPayload)

      expect(sectionOrm.manager.transaction).toHaveBeenCalledTimes(1)
      expect(deleteQuery.andWhere).toHaveBeenCalledWith('id NOT IN (:...keptIds)', {
        keptIds: ['item-1', 'item-2'],
      })
      expect(deleteQuery.andWhere).toHaveBeenCalledWith('id NOT IN (:...keptIds)', {
        keptIds: ['sec-1', 'sec-2'],
      })
      expect(deleteQuery.execute).toHaveBeenCalledTimes(2)
      expect(txManager.upsert).toHaveBeenCalledWith(
        Section,
        [
          {
            id: 'sec-1',
            classId: 'class-1',
            title: 'Week 1',
            description: null,
            orderIndex: 1,
          },
          {
            id: 'sec-2',
            classId: 'class-1',
            title: 'Week 2',
            description: null,
            orderIndex: 2,
          },
        ],
        ['id'],
      )
      expect(txManager.upsert).toHaveBeenCalledWith(
        SectionItem,
        [
          {
            id: 'item-1',
            sectionId: 'sec-1',
            itemType: 'LINK',
            title: 'Slides',
            externalUrl: 'https://example.com',
            orderIndex: 1,
            documentId: null,
            assignmentId: null,
            examId: null,
          },
          {
            id: 'item-2',
            sectionId: 'sec-1',
            itemType: 'DOCUMENT',
            title: 'Notes',
            externalUrl: null,
            orderIndex: 2,
            documentId: 'doc-1',
            assignmentId: null,
            examId: null,
          },
        ],
        ['id'],
      )
    })

    it('only deletes items that are not already soft-deleted', async () => {
      await repository.replaceAll('class-1', sectionsPayload)

      expect(deleteQuery.andWhere).toHaveBeenCalledWith('deleted_at IS NULL')
    })

    it('deletes everything and upserts nothing for an empty payload', async () => {
      await repository.replaceAll('class-1', [])

      expect(deleteQuery.andWhere).not.toHaveBeenCalledWith(
        'id NOT IN (:...keptIds)',
        expect.anything(),
      )
      expect(deleteQuery.execute).toHaveBeenCalledTimes(2)
      expect(txManager.upsert).not.toHaveBeenCalled()
    })

    it('trims the section description and stores blank ones as null', async () => {
      const withDescriptions = [
        { id: 'sec-1', title: 'Week 1', description: '  Intro  ', orderIndex: 1, items: [] },
        { id: 'sec-2', title: 'Week 2', description: '   ', orderIndex: 2, items: [] },
      ] as unknown as SaveSectionDto[]

      await repository.replaceAll('class-1', withDescriptions)

      expect(txManager.upsert).toHaveBeenCalledWith(
        Section,
        [
          {
            id: 'sec-1',
            classId: 'class-1',
            title: 'Week 1',
            description: 'Intro',
            orderIndex: 1,
          },
          {
            id: 'sec-2',
            classId: 'class-1',
            title: 'Week 2',
            description: null,
            orderIndex: 2,
          },
        ],
        ['id'],
      )
    })

    it('skips the item upsert when sections have no items', async () => {
      const onlyEmpty = [sectionsPayload[1]] as SaveSectionDto[]

      await repository.replaceAll('class-1', onlyEmpty)

      expect(txManager.upsert).toHaveBeenCalledTimes(1)
      expect(txManager.upsert).toHaveBeenCalledWith(Section, expect.any(Array), ['id'])
    })
  })
})