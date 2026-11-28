import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Role } from '../../../common/enums/role.enum.js'
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import type { CreateSectionDto } from '../dto/create-section.dto.js'
import type { CreateSectionItemDto } from '../dto/create-section-item.dto.js'
import type { ReorderDto } from '../dto/reorder.dto.js'
import type { SaveSectionsDto } from '../dto/save-sections.dto.js'
import type { SetCompletionDto } from '../dto/set-completion.dto.js'
import type { UpdateSectionItemDto } from '../dto/update-section-item.dto.js'
import type { UpdateSectionDto } from '../dto/update-section.dto.js'
import type { SectionItem } from '../entities/section-item.entity.js'
import type { Section } from '../entities/section.entity.js'
import { ItemType } from '../enums/item-type.enum.js'
import { AcademicFacade } from '../../academic/facades/academic.facade.js'
import { SectionRepository } from '../repositories/section.repository.js'
import { SectionView } from '../types/section-view.type.js'
import { ClassExamService } from './class-exam.service.js'
import { SectionService } from './section.service.js'

vi.mock('../utils/youtube.util.js', () => ({
  extractYoutubeVideoId: (url: string) => (url.includes('youtube.com') ? 'vid-1' : null),
}))

type Mock = ReturnType<typeof vi.fn>

const CLASS_ID = 'class-1'
const LECTURER_ID = 'lec-1'
const VALID_VIDEO = 'https://www.youtube.com/watch?v=abc'
const INVALID_VIDEO = 'https://evil.example.com/x'

function makeUser(id: string, role: Role): AuthenticatedUser {
  return { id, role } as unknown as AuthenticatedUser
}

const lecturer = makeUser(LECTURER_ID, Role.LECTURER)
const otherLecturer = makeUser('lec-2', Role.LECTURER)
const student = makeUser('stu-1', Role.STUDENT)

const sectionRows = [
  { id: 'sec-1', classId: CLASS_ID, title: 'Week 1', orderIndex: 1 },
  { id: 'sec-2', classId: CLASS_ID, title: 'Week 2', orderIndex: 2 },
] as unknown as Section[]

const itemRows = [
  { id: 'item-1', sectionId: 'sec-1', title: 'Slides', orderIndex: 1 },
  { id: 'item-2', sectionId: 'sec-1', title: 'Notes', orderIndex: 2 },
] as unknown as SectionItem[]

function expectedViews(): SectionView[] {
  return [
    SectionView.fromEntity(sectionRows[0], [itemRows[0], itemRows[1]]),
    SectionView.fromEntity(sectionRows[1], []),
  ]
}

function makeSaveDto(sections: { id: string; itemIds: string[] }[]): SaveSectionsDto {
  return {
    sections: sections.map((section, index) => ({
      id: section.id,
      title: `Section ${index + 1}`,
      orderIndex: index + 1,
      items: section.itemIds.map((id, itemIndex) => ({
        id,
        title: `Item ${itemIndex + 1}`,
        orderIndex: itemIndex + 1,
      })),
    })),
  } as unknown as SaveSectionsDto
}

describe('SectionService', () => {
  let repository: {
    findByClassId: Mock
    findItemsBySectionIds: Mock
    findIdsOwnedByOtherClasses: Mock
    createAtEnd: Mock
    findSection: Mock
    findItem: Mock
    itemExists: Mock
    updateSection: Mock
    deleteSection: Mock
    countLinkedItems: Mock
    setSectionOrder: Mock
    createItemAtEnd: Mock
    updateItem: Mock
    deleteItem: Mock
    setItemOrder: Mock
    findCompletedItemIds: Mock
    findItemInClass: Mock
    markCompleted: Mock
    unmarkCompleted: Mock
    replaceAll: Mock
  }
  let academicFacade: { assertCanViewClass: Mock; assertCanManageClass: Mock }
  let classExamService: { findExamIdsOfClass: Mock; isExamInClass: Mock }
  let contentNotifier: { notifyItemOpened: Mock; notifySectionOpened: Mock }
  let assignmentFacade: { findSchedules: Mock }
  let examFacade: { findSchedules: Mock }
  let service: SectionService

  beforeEach(() => {
    repository = {
      findByClassId: vi.fn().mockResolvedValue(sectionRows),
      findItemsBySectionIds: vi.fn().mockResolvedValue(itemRows),
      findIdsOwnedByOtherClasses: vi.fn().mockResolvedValue([]),
      createAtEnd: vi.fn(),
      findSection: vi.fn().mockResolvedValue(sectionRows[0]),
      findItem: vi.fn().mockResolvedValue({ id: 'item-1', itemType: ItemType.DOCUMENT }),
      itemExists: vi.fn().mockResolvedValue(false),
      updateSection: vi.fn().mockResolvedValue(undefined),
      deleteSection: vi.fn().mockResolvedValue(undefined),
      countLinkedItems: vi.fn().mockResolvedValue(0),
      setSectionOrder: vi.fn().mockResolvedValue(undefined),
      createItemAtEnd: vi.fn().mockResolvedValue(undefined),
      updateItem: vi.fn().mockResolvedValue(undefined),
      deleteItem: vi.fn().mockResolvedValue(undefined),
      setItemOrder: vi.fn().mockResolvedValue(undefined),
      findCompletedItemIds: vi.fn().mockResolvedValue(new Set<string>()),
      findItemInClass: vi.fn(),
      markCompleted: vi.fn().mockResolvedValue(undefined),
      unmarkCompleted: vi.fn().mockResolvedValue(undefined),
      replaceAll: vi.fn().mockResolvedValue(undefined),
    }
    academicFacade = {
      assertCanViewClass: vi.fn().mockResolvedValue(undefined),
      assertCanManageClass: vi.fn().mockResolvedValue(undefined),
    }
    classExamService = {
      findExamIdsOfClass: vi
        .fn()
        .mockImplementation((_classId: string, ids: string[]) => Promise.resolve(ids)),
      isExamInClass: vi.fn().mockResolvedValue(false),
    }
    contentNotifier = {
      notifyItemOpened: vi.fn().mockResolvedValue(undefined),
      notifySectionOpened: vi.fn().mockResolvedValue(undefined),
    }
    assignmentFacade = { findSchedules: vi.fn().mockResolvedValue(new Map()) }
    examFacade = { findSchedules: vi.fn().mockResolvedValue(new Map()) }
    service = new SectionService(
      repository as unknown as SectionRepository,
      academicFacade as unknown as AcademicFacade,
      classExamService as unknown as ClassExamService,
      contentNotifier as never,
      assignmentFacade as never,
      examFacade as never,
    )
  })

  describe('findByClass', () => {
    it('checks view access, then returns sections with their items', async () => {
      const result = await service.findByClass(CLASS_ID, lecturer)

      expect(academicFacade.assertCanViewClass).toHaveBeenCalledWith(CLASS_ID, lecturer)
      expect(result).toEqual(expectedViews())
      expect(repository.findItemsBySectionIds).toHaveBeenCalledWith(['sec-1', 'sec-2'])
      expect(repository.findCompletedItemIds).not.toHaveBeenCalled()
    })

    it('returns an empty list when the class has no sections', async () => {
      repository.findByClassId.mockResolvedValue([])
      repository.findItemsBySectionIds.mockResolvedValue([])

      await expect(service.findByClass(CLASS_ID, lecturer)).resolves.toEqual([])
    })

    it('gives a student only visible sections and items, with their own completion', async () => {
      const visibleSection = { ...sectionRows[0], isVisible: true } as unknown as Section
      const hiddenSection = { ...sectionRows[1], isVisible: false } as unknown as Section
      const visibleItem = { ...itemRows[0], isVisible: true } as unknown as SectionItem
      const hiddenItem = { ...itemRows[1], isVisible: false } as unknown as SectionItem
      const completed = new Set(['item-1'])
      repository.findByClassId.mockResolvedValue([visibleSection, hiddenSection])
      repository.findItemsBySectionIds.mockResolvedValue([visibleItem, hiddenItem])
      repository.findCompletedItemIds.mockResolvedValue(completed)

      const result = await service.findByClass(CLASS_ID, student)

      expect(repository.findItemsBySectionIds).toHaveBeenCalledWith(['sec-1'])
      expect(repository.findCompletedItemIds).toHaveBeenCalledWith('stu-1', ['item-1'])
      expect(result).toEqual([SectionView.fromEntity(visibleSection, [visibleItem], completed)])
    })

    it('propagates NotFoundException when the class does not exist', async () => {
      academicFacade.assertCanViewClass.mockRejectedValue(new NotFoundException())

      await expect(service.findByClass(CLASS_ID, lecturer)).rejects.toBeInstanceOf(
        NotFoundException,
      )
      expect(repository.findByClassId).not.toHaveBeenCalled()
    })

    it('propagates ForbiddenException when the user has no access to the class', async () => {
      academicFacade.assertCanViewClass.mockRejectedValue(new ForbiddenException())

      await expect(service.findByClass(CLASS_ID, student)).rejects.toBeInstanceOf(
        ForbiddenException,
      )
      expect(repository.findByClassId).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    const dto = { title: 'Week 3' } as unknown as CreateSectionDto

    it('checks manage access, appends a section and returns its view', async () => {
      const created = { id: 'sec-3', classId: CLASS_ID, title: 'Week 3', orderIndex: 3 }
      repository.createAtEnd.mockResolvedValue(created)

      const result = await service.create(CLASS_ID, dto, lecturer)

      expect(academicFacade.assertCanManageClass).toHaveBeenCalledWith(CLASS_ID, lecturer)
      expect(repository.createAtEnd).toHaveBeenCalledWith(CLASS_ID, 'Week 3')
      expect(result).toEqual(SectionView.fromEntity(created as unknown as Section))
    })

    it('propagates NotFoundException when the class does not exist', async () => {
      academicFacade.assertCanManageClass.mockRejectedValue(new NotFoundException())

      await expect(service.create(CLASS_ID, dto, lecturer)).rejects.toBeInstanceOf(
        NotFoundException,
      )
      expect(repository.createAtEnd).not.toHaveBeenCalled()
    })

    it('propagates ForbiddenException when the user cannot manage the class', async () => {
      academicFacade.assertCanManageClass.mockRejectedValue(new ForbiddenException())

      await expect(service.create(CLASS_ID, dto, otherLecturer)).rejects.toBeInstanceOf(
        ForbiddenException,
      )
      expect(repository.createAtEnd).not.toHaveBeenCalled()
    })
  })

  describe('updateSection', () => {
    it('updates the section and returns the fresh list', async () => {
      const dto = {
        title: 'Renamed',
        description: 'Intro',
        isVisible: false,
      } as unknown as UpdateSectionDto

      const result = await service.updateSection(CLASS_ID, 'sec-1', dto, lecturer)

      expect(academicFacade.assertCanManageClass).toHaveBeenCalledWith(CLASS_ID, lecturer)
      expect(repository.findSection).toHaveBeenCalledWith(CLASS_ID, 'sec-1')
      expect(repository.updateSection).toHaveBeenCalledWith('sec-1', {
        title: 'Renamed',
        description: 'Intro',
        isVisible: false,
      })
      expect(result).toEqual(expectedViews())
    })

    it('leaves the description alone when it is not sent', async () => {
      await service.updateSection(
        CLASS_ID,
        'sec-1',
        { title: 'Only title' } as unknown as UpdateSectionDto,
        lecturer,
      )

      expect(repository.updateSection).toHaveBeenCalledWith('sec-1', {
        title: 'Only title',
        description: undefined,
        isVisible: undefined,
      })
    })

    it('stores a blank description as null', async () => {
      await service.updateSection(
        CLASS_ID,
        'sec-1',
        { description: '   ' } as unknown as UpdateSectionDto,
        lecturer,
      )

      expect(repository.updateSection).toHaveBeenCalledWith(
        'sec-1',
        expect.objectContaining({ description: null }),
      )
    })

    it('appends an assignment as hidden until the lecturer opens it', async () => {
      const dto = {
        id: 'item-assignment',
        itemType: ItemType.ASSIGNMENT,
        title: 'Homework',
        assignmentId: 'assignment-1',
      } as unknown as CreateSectionItemDto

      await service.createItem(CLASS_ID, 'sec-1', dto, lecturer)

      expect(repository.createItemAtEnd).toHaveBeenCalledWith(
        'sec-1',
        expect.objectContaining({
          assignmentId: 'assignment-1',
          documentId: null,
          examId: null,
          isVisible: false,
        }),
      )
    })

    it('throws NotFoundException when the section is not of the class', async () => {
      repository.findSection.mockResolvedValue(null)

      await expect(
        service.updateSection(CLASS_ID, 'sec-x', {} as unknown as UpdateSectionDto, lecturer),
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(repository.updateSection).not.toHaveBeenCalled()
    })
  })

  describe('removeSection', () => {
    it('deletes a section that holds no linked items', async () => {
      const result = await service.removeSection(CLASS_ID, 'sec-1', lecturer)

      expect(repository.countLinkedItems).toHaveBeenCalledWith('sec-1')
      expect(repository.deleteSection).toHaveBeenCalledWith('sec-1')
      expect(result).toEqual(expectedViews())
    })

    it('refuses to delete a section that still holds documents, assignments or exams', async () => {
      repository.countLinkedItems.mockResolvedValue(2)

      await expect(service.removeSection(CLASS_ID, 'sec-1', lecturer)).rejects.toBeInstanceOf(
        BadRequestException,
      )
      expect(repository.deleteSection).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when the section is not of the class', async () => {
      repository.findSection.mockResolvedValue(null)

      await expect(service.removeSection(CLASS_ID, 'sec-x', lecturer)).rejects.toBeInstanceOf(
        NotFoundException,
      )
      expect(repository.deleteSection).not.toHaveBeenCalled()
    })
  })

  describe('reorderSections', () => {
    it('puts the listed sections first and keeps the rest after them', async () => {
      const result = await service.reorderSections(
        CLASS_ID,
        { ids: ['sec-2'] } as unknown as ReorderDto,
        lecturer,
      )

      expect(repository.setSectionOrder).toHaveBeenCalledWith(CLASS_ID, ['sec-2', 'sec-1'])
      expect(result).toEqual(expectedViews())
    })

    it('keeps the current order for an empty list', async () => {
      await service.reorderSections(CLASS_ID, { ids: [] } as unknown as ReorderDto, lecturer)

      expect(repository.setSectionOrder).toHaveBeenCalledWith(CLASS_ID, ['sec-1', 'sec-2'])
    })

    it('rejects ids that are not sections of the class', async () => {
      await expect(
        service.reorderSections(
          CLASS_ID,
          { ids: ['sec-x'] } as unknown as ReorderDto,
          lecturer,
        ),
      ).rejects.toThrow('Order references unknown ids')
      expect(repository.setSectionOrder).not.toHaveBeenCalled()
    })
  })

  describe('createItem', () => {
    const video = {
      id: 'item-new',
      itemType: ItemType.VIDEO,
      title: 'Intro',
      externalUrl: VALID_VIDEO,
    } as unknown as CreateSectionItemDto

    it('appends a video with a valid YouTube link', async () => {
      const result = await service.createItem(CLASS_ID, 'sec-1', video, lecturer)

      expect(repository.findSection).toHaveBeenCalledWith(CLASS_ID, 'sec-1')
      expect(repository.itemExists).toHaveBeenCalledWith('item-new')
      expect(repository.createItemAtEnd).toHaveBeenCalledWith('sec-1', {
        id: 'item-new',
        itemType: ItemType.VIDEO,
        title: 'Intro',
        externalUrl: VALID_VIDEO,
        documentId: null,
        assignmentId: null,
        examId: null,
        isVisible: true,
      })
      expect(result).toEqual(expectedViews())
    })

    it('appends a document that references exactly one document', async () => {
      const dto = {
        id: 'item-new',
        itemType: ItemType.DOCUMENT,
        title: 'Notes',
        documentId: 'doc-1',
      } as unknown as CreateSectionItemDto

      await service.createItem(CLASS_ID, 'sec-1', dto, lecturer)

      expect(repository.createItemAtEnd).toHaveBeenCalledWith(
        'sec-1',
        expect.objectContaining({
          documentId: 'doc-1',
          assignmentId: null,
          examId: null,
          isVisible: true,
        }),
      )
    })

    it('throws NotFoundException when the section is not of the class', async () => {
      repository.findSection.mockResolvedValue(null)

      await expect(service.createItem(CLASS_ID, 'sec-x', video, lecturer)).rejects.toBeInstanceOf(
        NotFoundException,
      )
      expect(repository.createItemAtEnd).not.toHaveBeenCalled()
    })

    it.each([
      ['a video without a link', { itemType: ItemType.VIDEO }],
      ['a video with a non-YouTube link', { itemType: ItemType.VIDEO, externalUrl: INVALID_VIDEO }],
    ])('rejects %s', async (_name, extra) => {
      const dto = { id: 'item-new', title: 'x', ...extra } as unknown as CreateSectionItemDto

      await expect(service.createItem(CLASS_ID, 'sec-1', dto, lecturer)).rejects.toThrow(
        'A video needs a valid YouTube link',
      )
      expect(repository.createItemAtEnd).not.toHaveBeenCalled()
    })

    it('rejects a link on an item that is not a video', async () => {
      const dto = {
        id: 'item-new',
        itemType: ItemType.DOCUMENT,
        title: 'x',
        documentId: 'doc-1',
        externalUrl: VALID_VIDEO,
      } as unknown as CreateSectionItemDto

      await expect(service.createItem(CLASS_ID, 'sec-1', dto, lecturer)).rejects.toThrow(
        'Only a video can have a link',
      )
    })

    it.each([
      ['a document without a document id', { itemType: ItemType.DOCUMENT }],
      [
        'a document that also references an assignment',
        { itemType: ItemType.DOCUMENT, documentId: 'doc-1', assignmentId: 'asg-1' },
      ],
      ['an assignment without an assignment id', { itemType: ItemType.ASSIGNMENT }],
      [
        'an assignment that references a document instead',
        { itemType: ItemType.ASSIGNMENT, documentId: 'doc-1' },
      ],
      [
        'a video that references a document',
        { itemType: ItemType.VIDEO, externalUrl: VALID_VIDEO, documentId: 'doc-1' },
      ],
    ])('rejects %s', async (_name, extra) => {
      const dto = { id: 'item-new', title: 'x', ...extra } as unknown as CreateSectionItemDto

      await expect(service.createItem(CLASS_ID, 'sec-1', dto, lecturer)).rejects.toBeInstanceOf(
        BadRequestException,
      )
      expect(repository.createItemAtEnd).not.toHaveBeenCalled()
    })

    it('rejects an item id that already exists', async () => {
      repository.itemExists.mockResolvedValue(true)

      await expect(service.createItem(CLASS_ID, 'sec-1', video, lecturer)).rejects.toThrow(
        'Item id already exists',
      )
      expect(repository.createItemAtEnd).not.toHaveBeenCalled()
    })

    describe('exam items', () => {
      const exam = {
        id: 'item-new',
        itemType: ItemType.EXAM,
        title: 'Midterm',
        examId: 'exam-1',
      } as unknown as CreateSectionItemDto

      it('appends an exam of the class that is not shown yet', async () => {
        await service.createItem(CLASS_ID, 'sec-1', exam, lecturer)

        expect(classExamService.findExamIdsOfClass).toHaveBeenCalledWith(CLASS_ID, ['exam-1'])
        expect(classExamService.isExamInClass).toHaveBeenCalledWith(CLASS_ID, 'exam-1')
        expect(repository.createItemAtEnd).toHaveBeenCalledWith(
          'sec-1',
          expect.objectContaining({ examId: 'exam-1', isVisible: false }),
        )
      })

      it('rejects an exam that is missing or belongs to another class', async () => {
        classExamService.findExamIdsOfClass.mockResolvedValue([])

        await expect(service.createItem(CLASS_ID, 'sec-1', exam, lecturer)).rejects.toThrow(
          'no longer exists',
        )
        expect(repository.createItemAtEnd).not.toHaveBeenCalled()
      })

      it('rejects an exam that the class already shows', async () => {
        classExamService.isExamInClass.mockResolvedValue(true)

        await expect(service.createItem(CLASS_ID, 'sec-1', exam, lecturer)).rejects.toThrow(
          'An exam can only be added once',
        )
        expect(repository.createItemAtEnd).not.toHaveBeenCalled()
      })
    })
  })

  describe('updateItem', () => {
    it('updates title and visibility of an item', async () => {
      const dto = { title: 'Renamed', isVisible: false } as unknown as UpdateSectionItemDto

      const result = await service.updateItem(CLASS_ID, 'sec-1', 'item-1', dto, lecturer)

      expect(repository.findItem).toHaveBeenCalledWith('sec-1', 'item-1')
      expect(repository.updateItem).toHaveBeenCalledWith('item-1', {
        title: 'Renamed',
        externalUrl: undefined,
        isVisible: false,
      })
      expect(result).toEqual(expectedViews())
    })

    it('gives a video a new YouTube link', async () => {
      repository.findItem.mockResolvedValue({ id: 'item-1', itemType: ItemType.VIDEO })

      await service.updateItem(
        CLASS_ID,
        'sec-1',
        'item-1',
        { externalUrl: VALID_VIDEO } as unknown as UpdateSectionItemDto,
        lecturer,
      )

      expect(repository.updateItem).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({ externalUrl: VALID_VIDEO }),
      )
    })

    it.each([
      ['a non-YouTube link on a video', ItemType.VIDEO, INVALID_VIDEO],
      ['clearing the link of a video', ItemType.VIDEO, null],
      ['an empty link on a video', ItemType.VIDEO, ''],
      ['a link on a document', ItemType.DOCUMENT, VALID_VIDEO],
    ])('rejects %s', async (_name, itemType, externalUrl) => {
      repository.findItem.mockResolvedValue({ id: 'item-1', itemType })

      await expect(
        service.updateItem(
          CLASS_ID,
          'sec-1',
          'item-1',
          { externalUrl } as unknown as UpdateSectionItemDto,
          lecturer,
        ),
      ).rejects.toThrow('A video needs a valid YouTube link')
      expect(repository.updateItem).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when the item is not in the section', async () => {
      repository.findItem.mockResolvedValue(null)

      await expect(
        service.updateItem(
          CLASS_ID,
          'sec-1',
          'item-x',
          {} as unknown as UpdateSectionItemDto,
          lecturer,
        ),
      ).rejects.toThrow('Item not found')
      expect(repository.updateItem).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when the section is not of the class', async () => {
      repository.findSection.mockResolvedValue(null)

      await expect(
        service.updateItem(
          CLASS_ID,
          'sec-x',
          'item-1',
          {} as unknown as UpdateSectionItemDto,
          lecturer,
        ),
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(repository.findItem).not.toHaveBeenCalled()
    })

    describe('Zalo notification when an item is opened', () => {
      const openAt = new Date('2099-11-10T01:00:00Z')
      const closeAt = new Date('2099-11-17T16:59:00Z')

      beforeEach(() => {
        repository.findSection.mockResolvedValue({ ...sectionRows[0], isVisible: true })
      })

      it('sends the start and end of an assignment together with the item', async () => {
        const hidden = { id: 'item-a', itemType: ItemType.ASSIGNMENT, title: 'Lab 1', assignmentId: 'as-1', examId: null, isVisible: false }
        repository.findItem
          .mockResolvedValueOnce(hidden)
          .mockResolvedValue({ ...hidden, isVisible: true })
        assignmentFacade.findSchedules.mockResolvedValue(new Map([['as-1', { openAt, closeAt }]]))

        await service.updateItem(CLASS_ID, 'sec-1', 'item-a', { isVisible: true } as UpdateSectionItemDto, lecturer)

        await vi.waitFor(() => expect(contentNotifier.notifyItemOpened).toHaveBeenCalled())
        expect(contentNotifier.notifyItemOpened).toHaveBeenCalledWith(
          CLASS_ID,
          'Week 1',
          expect.objectContaining({ itemType: ItemType.ASSIGNMENT, title: 'Lab 1', openAt, closeAt }),
          lecturer,
        )
      })

      it('sends the start and end of an exam together with the item', async () => {
        const hidden = { id: 'item-e', itemType: ItemType.EXAM, title: 'Giữa kỳ', assignmentId: null, examId: 'ex-1', isVisible: false }
        repository.findItem
          .mockResolvedValueOnce(hidden)
          .mockResolvedValue({ ...hidden, isVisible: true })
        examFacade.findSchedules.mockResolvedValue(new Map([['ex-1', { openAt, closeAt }]]))

        await service.updateItem(CLASS_ID, 'sec-1', 'item-e', { isVisible: true } as UpdateSectionItemDto, lecturer)

        await vi.waitFor(() => expect(contentNotifier.notifyItemOpened).toHaveBeenCalled())
        expect(contentNotifier.notifyItemOpened).toHaveBeenCalledWith(
          CLASS_ID,
          'Week 1',
          expect.objectContaining({ itemType: ItemType.EXAM, title: 'Giữa kỳ', openAt, closeAt }),
          lecturer,
        )
      })
    })
  })

  describe('removeItem', () => {
    it('deletes a video', async () => {
      repository.findItem.mockResolvedValue({ id: 'item-1', itemType: ItemType.VIDEO })

      const result = await service.removeItem(CLASS_ID, 'sec-1', 'item-1', lecturer)

      expect(repository.deleteItem).toHaveBeenCalledWith('item-1')
      expect(result).toEqual(expectedViews())
    })

    it.each([ItemType.DOCUMENT, ItemType.ASSIGNMENT, ItemType.EXAM])(
      'refuses to delete a %s item (it is removed from its own screen)',
      async (itemType) => {
        repository.findItem.mockResolvedValue({ id: 'item-1', itemType })

        await expect(
          service.removeItem(CLASS_ID, 'sec-1', 'item-1', lecturer),
        ).rejects.toBeInstanceOf(BadRequestException)
        expect(repository.deleteItem).not.toHaveBeenCalled()
      },
    )

    it('throws NotFoundException when the item is not in the section', async () => {
      repository.findItem.mockResolvedValue(null)

      await expect(service.removeItem(CLASS_ID, 'sec-1', 'item-x', lecturer)).rejects.toThrow(
        'Item not found',
      )
      expect(repository.deleteItem).not.toHaveBeenCalled()
    })
  })

  describe('reorderItems', () => {
    it('puts the listed items first and keeps the rest after them', async () => {
      const result = await service.reorderItems(
        CLASS_ID,
        'sec-1',
        { ids: ['item-2'] } as unknown as ReorderDto,
        lecturer,
      )

      expect(repository.findItemsBySectionIds).toHaveBeenCalledWith(['sec-1'])
      expect(repository.setItemOrder).toHaveBeenCalledWith('sec-1', ['item-2', 'item-1'])
      expect(result).toEqual(expectedViews())
    })

    it('rejects ids that are not items of the section', async () => {
      await expect(
        service.reorderItems(
          CLASS_ID,
          'sec-1',
          { ids: ['item-x'] } as unknown as ReorderDto,
          lecturer,
        ),
      ).rejects.toThrow('Order references unknown ids')
      expect(repository.setItemOrder).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when the section is not of the class', async () => {
      repository.findSection.mockResolvedValue(null)

      await expect(
        service.reorderItems(CLASS_ID, 'sec-x', { ids: [] } as unknown as ReorderDto, lecturer),
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(repository.setItemOrder).not.toHaveBeenCalled()
    })
  })

  describe('setItemCompleted', () => {
    const visibleItem = { id: 'item-1', isVisible: true, section: { isVisible: true } }

    it('marks an item as completed', async () => {
      repository.findItemInClass.mockResolvedValue(visibleItem)

      const result = await service.setItemCompleted(
        CLASS_ID,
        'item-1',
        { completed: true } as unknown as SetCompletionDto,
        student,
      )

      expect(academicFacade.assertCanViewClass).toHaveBeenCalledWith(CLASS_ID, student)
      expect(repository.findItemInClass).toHaveBeenCalledWith(CLASS_ID, 'item-1')
      expect(repository.markCompleted).toHaveBeenCalledWith('stu-1', 'item-1')
      expect(repository.unmarkCompleted).not.toHaveBeenCalled()
      expect(result).toEqual({ itemId: 'item-1', isCompleted: true })
    })

    it('takes the completion mark back', async () => {
      repository.findItemInClass.mockResolvedValue(visibleItem)

      const result = await service.setItemCompleted(
        CLASS_ID,
        'item-1',
        { completed: false } as unknown as SetCompletionDto,
        student,
      )

      expect(repository.unmarkCompleted).toHaveBeenCalledWith('stu-1', 'item-1')
      expect(repository.markCompleted).not.toHaveBeenCalled()
      expect(result).toEqual({ itemId: 'item-1', isCompleted: false })
    })

    it.each([
      ['does not exist in the class', null],
      ['is hidden', { id: 'item-1', isVisible: false, section: { isVisible: true } }],
      ['sits in a hidden section', { id: 'item-1', isVisible: true, section: { isVisible: false } }],
    ])('throws NotFoundException when the item %s', async (_name, item) => {
      repository.findItemInClass.mockResolvedValue(item)

      await expect(
        service.setItemCompleted(
          CLASS_ID,
          'item-1',
          { completed: true } as unknown as SetCompletionDto,
          student,
        ),
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(repository.markCompleted).not.toHaveBeenCalled()
      expect(repository.unmarkCompleted).not.toHaveBeenCalled()
    })

    it('propagates ForbiddenException when the student is not enrolled', async () => {
      academicFacade.assertCanViewClass.mockRejectedValue(new ForbiddenException())

      await expect(
        service.setItemCompleted(
          CLASS_ID,
          'item-1',
          { completed: true } as unknown as SetCompletionDto,
          student,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException)
      expect(repository.findItemInClass).not.toHaveBeenCalled()
    })
  })

  describe('manage access', () => {
    const writes = (): Mock[] => [
      repository.createAtEnd,
      repository.updateSection,
      repository.deleteSection,
      repository.setSectionOrder,
      repository.createItemAtEnd,
      repository.updateItem,
      repository.deleteItem,
      repository.setItemOrder,
      repository.replaceAll,
    ]

    const operations: [string, (s: SectionService) => Promise<unknown>][] = [
      ['create', (s) => s.create(CLASS_ID, {} as CreateSectionDto, otherLecturer)],
      [
        'updateSection',
        (s) => s.updateSection(CLASS_ID, 'sec-1', {} as UpdateSectionDto, otherLecturer),
      ],
      ['removeSection', (s) => s.removeSection(CLASS_ID, 'sec-1', otherLecturer)],
      ['reorderSections', (s) => s.reorderSections(CLASS_ID, { ids: [] } as ReorderDto, otherLecturer)],
      [
        'createItem',
        (s) => s.createItem(CLASS_ID, 'sec-1', {} as CreateSectionItemDto, otherLecturer),
      ],
      [
        'updateItem',
        (s) => s.updateItem(CLASS_ID, 'sec-1', 'item-1', {} as UpdateSectionItemDto, otherLecturer),
      ],
      ['removeItem', (s) => s.removeItem(CLASS_ID, 'sec-1', 'item-1', otherLecturer)],
      [
        'reorderItems',
        (s) => s.reorderItems(CLASS_ID, 'sec-1', { ids: [] } as ReorderDto, otherLecturer),
      ],
      ['saveAll', (s) => s.saveAll(CLASS_ID, makeSaveDto([]), otherLecturer)],
    ]

    it.each(operations)('%s is refused for a user who cannot manage the class', async (_name, run) => {
      academicFacade.assertCanManageClass.mockRejectedValue(new ForbiddenException())

      await expect(run(service)).rejects.toBeInstanceOf(ForbiddenException)
      for (const write of writes()) expect(write).not.toHaveBeenCalled()
    })
  })

  describe('saveAll (deprecated)', () => {
    const dto = makeSaveDto([
      { id: 'sec-1', itemIds: ['item-1', 'item-2'] },
      { id: 'sec-2', itemIds: [] },
    ])

    it('validates ownership, replaces everything and returns the fresh views', async () => {
      const result = await service.saveAll(CLASS_ID, dto, lecturer)

      expect(repository.findIdsOwnedByOtherClasses).toHaveBeenCalledWith(
        CLASS_ID,
        ['sec-1', 'sec-2'],
        ['item-1', 'item-2'],
      )
      expect(repository.replaceAll).toHaveBeenCalledWith(CLASS_ID, dto.sections)
      expect(result).toEqual(expectedViews())
    })

    it('propagates NotFoundException when the class does not exist', async () => {
      academicFacade.assertCanManageClass.mockRejectedValue(new NotFoundException())

      await expect(service.saveAll(CLASS_ID, dto, lecturer)).rejects.toBeInstanceOf(
        NotFoundException,
      )
      expect(repository.replaceAll).not.toHaveBeenCalled()
    })

    it('rejects duplicate section ids', async () => {
      const duplicated = makeSaveDto([
        { id: 'sec-1', itemIds: [] },
        { id: 'sec-1', itemIds: [] },
      ])

      await expect(service.saveAll(CLASS_ID, duplicated, lecturer)).rejects.toBeInstanceOf(
        BadRequestException,
      )
      expect(repository.findIdsOwnedByOtherClasses).not.toHaveBeenCalled()
      expect(repository.replaceAll).not.toHaveBeenCalled()
    })

    it('rejects duplicate item ids, even across different sections', async () => {
      const duplicated = makeSaveDto([
        { id: 'sec-1', itemIds: ['item-1'] },
        { id: 'sec-2', itemIds: ['item-1'] },
      ])

      await expect(service.saveAll(CLASS_ID, duplicated, lecturer)).rejects.toBeInstanceOf(
        BadRequestException,
      )
      expect(repository.replaceAll).not.toHaveBeenCalled()
    })

    it('rejects ids that belong to another class', async () => {
      repository.findIdsOwnedByOtherClasses.mockResolvedValue(['sec-x'])

      await expect(service.saveAll(CLASS_ID, dto, lecturer)).rejects.toThrow(
        'Payload references content of another class',
      )
      expect(repository.replaceAll).not.toHaveBeenCalled()
    })

    it('accepts an empty payload and clears the class', async () => {
      repository.findByClassId.mockResolvedValue([])
      repository.findItemsBySectionIds.mockResolvedValue([])

      const result = await service.saveAll(CLASS_ID, makeSaveDto([]), lecturer)

      expect(repository.replaceAll).toHaveBeenCalledWith(CLASS_ID, [])
      expect(result).toEqual([])
    })

    describe('video items', () => {
      const videoDto = (externalUrl?: string): SaveSectionsDto =>
        ({
          sections: [
            {
              id: 'sec-1',
              title: 'Week 1',
              orderIndex: 1,
              items: [
                { id: 'v-1', itemType: 'VIDEO', title: 'Intro', orderIndex: 1, externalUrl },
              ],
            },
          ],
        }) as unknown as SaveSectionsDto

      it('saves a video with a valid YouTube link', async () => {
        const payload = videoDto(VALID_VIDEO)

        await service.saveAll(CLASS_ID, payload, lecturer)

        expect(repository.replaceAll).toHaveBeenCalledWith(CLASS_ID, payload.sections)
      })

      it.each([
        ['without a link', undefined],
        ['with a non-YouTube link', INVALID_VIDEO],
      ])('rejects a video %s', async (_name, url) => {
        await expect(service.saveAll(CLASS_ID, videoDto(url), lecturer)).rejects.toThrow(
          'A video needs a valid YouTube link',
        )
        expect(repository.replaceAll).not.toHaveBeenCalled()
      })
    })

    describe('exam items', () => {
      const examDto = (items: Record<string, unknown>[]): SaveSectionsDto =>
        ({
          sections: [{ id: 'sec-1', title: 'Week 1', orderIndex: 1, items }],
        }) as unknown as SaveSectionsDto
      const examItem = (id: string, extra: Record<string, unknown> = {}) => ({
        id,
        itemType: 'EXAM',
        title: 'Midterm',
        orderIndex: 1,
        examId: `exam-${id}`,
        ...extra,
      })

      it('saves exam items whose exams belong to the class', async () => {
        const payload = examDto([examItem('a'), examItem('b')])

        await service.saveAll(CLASS_ID, payload, lecturer)

        expect(classExamService.findExamIdsOfClass).toHaveBeenCalledWith(CLASS_ID, [
          'exam-a',
          'exam-b',
        ])
        expect(repository.replaceAll).toHaveBeenCalledWith(CLASS_ID, payload.sections)
      })

      it('does not look up exams when the payload has none', async () => {
        await service.saveAll(CLASS_ID, dto, lecturer)

        expect(classExamService.findExamIdsOfClass).not.toHaveBeenCalled()
      })

      it('rejects an exam item without an exam id', async () => {
        const payload = examDto([examItem('a', { examId: null })])

        await expect(service.saveAll(CLASS_ID, payload, lecturer)).rejects.toThrow(
          'An exam item must reference an exam',
        )
        expect(repository.replaceAll).not.toHaveBeenCalled()
      })

      it('rejects an exam item that also references a document or an assignment', async () => {
        for (const extra of [{ documentId: 'doc-1' }, { assignmentId: 'asg-1' }]) {
          const payload = examDto([examItem('a', extra)])

          await expect(service.saveAll(CLASS_ID, payload, lecturer)).rejects.toBeInstanceOf(
            BadRequestException,
          )
        }
        expect(repository.replaceAll).not.toHaveBeenCalled()
      })

      it('rejects an exam id on an item that is not an exam', async () => {
        const payload = examDto([
          { id: 'a', itemType: 'DOCUMENT', title: 'Notes', orderIndex: 1, examId: 'exam-a' },
        ])

        await expect(service.saveAll(CLASS_ID, payload, lecturer)).rejects.toThrow(
          'Only an exam item can reference an exam',
        )
        expect(repository.replaceAll).not.toHaveBeenCalled()
      })

      it('rejects the same exam added twice', async () => {
        const payload = examDto([
          examItem('a', { examId: 'exam-x' }),
          examItem('b', { examId: 'exam-x' }),
        ])

        await expect(service.saveAll(CLASS_ID, payload, lecturer)).rejects.toThrow(
          'An exam can only be added once',
        )
        expect(repository.replaceAll).not.toHaveBeenCalled()
      })

      it('rejects an exam that is missing or belongs to another class', async () => {
        classExamService.findExamIdsOfClass.mockResolvedValue(['exam-a'])
        const payload = examDto([examItem('a'), examItem('b')])

        await expect(service.saveAll(CLASS_ID, payload, lecturer)).rejects.toThrow(
          'no longer exists',
        )
        expect(repository.replaceAll).not.toHaveBeenCalled()
      })
    })
  })
})