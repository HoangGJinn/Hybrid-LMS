import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Repository } from 'typeorm'
import { ClassStudent } from '../../academic/entities/class-student.entity.js'
import { Class } from '../../academic/entities/class.entity.js'
import type { SaveSectionDto } from '../dto/save-section.dto.js'
import { SectionItem } from '../entities/section-item.entity.js'
import { Section } from '../entities/section.entity.js'
import { SectionRepository } from './section.repository.js'

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
  let sectionOrm: { find: Mock; manager: { transaction: Mock; exists: Mock } }
  let itemOrm: { find: Mock; createQueryBuilder: Mock }
  let classOrm: { findOne: Mock }
  let itemQuery: Builder
  let maxQuery: Builder
  let deleteQuery: Builder
  let txManager: {
    getRepository: Mock
    create: Mock
    save: Mock
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
      createQueryBuilder: vi.fn().mockReturnValue(deleteQuery),
      upsert: vi.fn(),
    }
    sectionOrm = {
      find: vi.fn(),
      manager: {
        transaction: vi.fn((callback: (manager: unknown) => Promise<unknown>) =>
          callback(txManager),
        ),
        exists: vi.fn(),
      },
    }
    itemOrm = { find: vi.fn(), createQueryBuilder: vi.fn().mockReturnValue(itemQuery) }
    classOrm = { findOne: vi.fn() }
    repository = new SectionRepository(
      sectionOrm as unknown as Repository<Section>,
      itemOrm as unknown as Repository<SectionItem>,
      classOrm as unknown as Repository<Class>,
    )
  })

  describe('findClassLecturerId', () => {
    it('returns the lecturer id of the class', async () => {
      classOrm.findOne.mockResolvedValue({ id: 'class-1', lecturerId: 'lec-1' })
      await expect(repository.findClassLecturerId('class-1')).resolves.toBe('lec-1')
    })

    it('returns null when the class does not exist', async () => {
      classOrm.findOne.mockResolvedValue(null)
      await expect(repository.findClassLecturerId('class-1')).resolves.toBeNull()
    })
  })

  it('findByClassId lists sections in display order', async () => {
    const rows = [{ id: 'sec-1' }]
    sectionOrm.find.mockResolvedValue(rows)
    await expect(repository.findByClassId('class-1')).resolves.toBe(rows)
    expect(sectionOrm.find).toHaveBeenCalledWith({
      where: { classId: 'class-1' },
      order: { orderIndex: 'ASC' },
    })
  })

  describe('findItemsBySectionIds', () => {
    it('returns an empty list without querying when no sections', async () => {
      await expect(repository.findItemsBySectionIds([])).resolves.toEqual([])
      expect(itemOrm.find).not.toHaveBeenCalled()
    })

    it('loads the items of the given sections', async () => {
      const rows = [{ id: 'item-1' }]
      itemOrm.find.mockResolvedValue(rows)
      await expect(repository.findItemsBySectionIds(['sec-1'])).resolves.toBe(rows)
      expect(itemOrm.find).toHaveBeenCalledTimes(1)
    })
  })

  describe('findIdsOwnedByOtherClasses', () => {
    it('returns an empty list without querying when no ids are given', async () => {
      await expect(
        repository.findIdsOwnedByOtherClasses('class-1', [], []),
      ).resolves.toEqual([])
      expect(sectionOrm.find).not.toHaveBeenCalled()
      expect(itemOrm.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('combines foreign section ids and foreign item ids', async () => {
      sectionOrm.find.mockResolvedValue([{ id: 'sec-x' }])
      itemQuery.getRawMany.mockResolvedValue([{ id: 'item-x' }])

      const result = await repository.findIdsOwnedByOtherClasses(
        'class-1',
        ['sec-x'],
        ['item-x'],
      )

      expect(result).toEqual(['sec-x', 'item-x'])
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

  describe('replaceAll', () => {
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
          },
        ],
        ['id'],
      )
    })

    it('deletes everything and upserts nothing for an empty payload', async () => {
      await repository.replaceAll('class-1', [])

      expect(deleteQuery.andWhere).not.toHaveBeenCalled()
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

  describe('isStudentEnrolled', () => {
    it('returns true when the student is enrolled', async () => {
      sectionOrm.manager.exists.mockResolvedValue(true)
      await expect(repository.isStudentEnrolled('class-1', 'stu-1')).resolves.toBe(true)
      expect(sectionOrm.manager.exists).toHaveBeenCalledWith(ClassStudent, {
        where: { classId: 'class-1', studentId: 'stu-1' },
      })
    })

    it('returns false when the student is not enrolled', async () => {
      sectionOrm.manager.exists.mockResolvedValue(false)
      await expect(repository.isStudentEnrolled('class-1', 'stu-1')).resolves.toBe(false)
    })
  })
})