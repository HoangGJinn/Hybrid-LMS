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
import { SectionService } from '../services/section.service.js'
import type { SectionView } from '../types/section-view.type.js'
import { SectionController } from './section.controller.js'

type Mock = ReturnType<typeof vi.fn>

const CLASS_ID = '3f2b6c1e-8d4a-4e5b-9c7a-1a2b3c4d5e6f'
const SECTION_ID = '7a1d9e52-6b3c-4f80-a2d1-5c9e0b8f4a37'
const ITEM_ID = 'c4e8a0b6-2d97-4a13-8f5e-9b1d3c7a6e20'
const lecturer = { id: 'lec-1', role: Role.LECTURER } as unknown as AuthenticatedUser
const student = { id: 'stu-1', role: Role.STUDENT } as unknown as AuthenticatedUser

describe('SectionController', () => {
  let service: {
    findByClass: Mock
    create: Mock
    saveAll: Mock
    setItemCompleted: Mock
    reorderSections: Mock
    updateSection: Mock
    removeSection: Mock
    createItem: Mock
    reorderItems: Mock
    updateItem: Mock
    removeItem: Mock
  }
  let controller: SectionController

  const views = [{ id: 'sec-1' }] as unknown as SectionView[]

  beforeEach(() => {
    service = {
      findByClass: vi.fn(),
      create: vi.fn(),
      saveAll: vi.fn(),
      setItemCompleted: vi.fn(),
      reorderSections: vi.fn(),
      updateSection: vi.fn(),
      removeSection: vi.fn(),
      createItem: vi.fn(),
      reorderItems: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
    }
    controller = new SectionController(service as unknown as SectionService)
  })

  describe('findAll', () => {
    it('returns the sections of the class from the service', async () => {
      service.findByClass.mockResolvedValue(views)

      await expect(controller.findAll(CLASS_ID, lecturer)).resolves.toBe(views)
      expect(service.findByClass).toHaveBeenCalledWith(CLASS_ID, lecturer)
    })

    it('passes the current user through (students read too)', async () => {
      service.findByClass.mockResolvedValue(views)

      await controller.findAll(CLASS_ID, student)

      expect(service.findByClass).toHaveBeenCalledWith(CLASS_ID, student)
    })

    it('propagates service errors', async () => {
      const error = new Error('forbidden')
      service.findByClass.mockRejectedValue(error)

      await expect(controller.findAll(CLASS_ID, lecturer)).rejects.toBe(error)
    })
  })

  describe('create', () => {
    it('creates a section through the service', async () => {
      const dto = { title: 'Week 1' } as unknown as CreateSectionDto
      const view = { id: 'sec-1' } as unknown as SectionView
      service.create.mockResolvedValue(view)

      await expect(controller.create(CLASS_ID, dto, lecturer)).resolves.toBe(view)
      expect(service.create).toHaveBeenCalledWith(CLASS_ID, dto, lecturer)
    })

    it('propagates service errors', async () => {
      const error = new Error('not found')
      service.create.mockRejectedValue(error)

      await expect(
        controller.create(CLASS_ID, { title: 'x' } as unknown as CreateSectionDto, lecturer),
      ).rejects.toBe(error)
    })
  })

  describe('saveAll (deprecated)', () => {
    it('saves the whole editor state through the service', async () => {
      const dto = { sections: [] } as unknown as SaveSectionsDto
      service.saveAll.mockResolvedValue(views)

      await expect(controller.saveAll(CLASS_ID, dto, lecturer)).resolves.toBe(views)
      expect(service.saveAll).toHaveBeenCalledWith(CLASS_ID, dto, lecturer)
    })

    it('propagates service errors', async () => {
      const error = new Error('bad request')
      service.saveAll.mockRejectedValue(error)

      await expect(
        controller.saveAll(CLASS_ID, { sections: [] } as unknown as SaveSectionsDto, lecturer),
      ).rejects.toBe(error)
    })
  })

  describe('setCompletion', () => {
    it('marks an item as completed for the student', async () => {
      const dto = { isCompleted: true } as unknown as SetCompletionDto
      const result = { itemId: ITEM_ID, isCompleted: true }
      service.setItemCompleted.mockResolvedValue(result)

      await expect(controller.setCompletion(CLASS_ID, ITEM_ID, dto, student)).resolves.toBe(result)
      expect(service.setItemCompleted).toHaveBeenCalledWith(CLASS_ID, ITEM_ID, dto, student)
    })

    it('can mark an item as not completed', async () => {
      const dto = { isCompleted: false } as unknown as SetCompletionDto
      const result = { itemId: ITEM_ID, isCompleted: false }
      service.setItemCompleted.mockResolvedValue(result)

      await expect(controller.setCompletion(CLASS_ID, ITEM_ID, dto, student)).resolves.toEqual(
        result,
      )
    })

    it('propagates service errors', async () => {
      const error = new Error('not enrolled')
      service.setItemCompleted.mockRejectedValue(error)

      await expect(
        controller.setCompletion(
          CLASS_ID,
          ITEM_ID,
          { isCompleted: true } as unknown as SetCompletionDto,
          student,
        ),
      ).rejects.toBe(error)
    })
  })

  describe('reorder', () => {
    it('reorders the sections and returns the fresh list', async () => {
      const dto = { ids: ['b', 'a'] } as unknown as ReorderDto
      service.reorderSections.mockResolvedValue(views)

      await expect(controller.reorder(CLASS_ID, dto, lecturer)).resolves.toBe(views)
      expect(service.reorderSections).toHaveBeenCalledWith(CLASS_ID, dto, lecturer)
    })

    it('propagates service errors', async () => {
      const error = new Error('bad order')
      service.reorderSections.mockRejectedValue(error)

      await expect(
        controller.reorder(CLASS_ID, { ids: [] } as unknown as ReorderDto, lecturer),
      ).rejects.toBe(error)
    })
  })

  describe('update', () => {
    it('updates a section and returns the fresh list', async () => {
      const dto = { title: 'Renamed' } as unknown as UpdateSectionDto
      service.updateSection.mockResolvedValue(views)

      await expect(controller.update(CLASS_ID, SECTION_ID, dto, lecturer)).resolves.toBe(views)
      expect(service.updateSection).toHaveBeenCalledWith(CLASS_ID, SECTION_ID, dto, lecturer)
    })

    it('propagates service errors', async () => {
      const error = new Error('section not found')
      service.updateSection.mockRejectedValue(error)

      await expect(
        controller.update(CLASS_ID, SECTION_ID, {} as unknown as UpdateSectionDto, lecturer),
      ).rejects.toBe(error)
    })
  })

  describe('remove', () => {
    it('removes a section and returns the fresh list', async () => {
      service.removeSection.mockResolvedValue(views)

      await expect(controller.remove(CLASS_ID, SECTION_ID, lecturer)).resolves.toBe(views)
      expect(service.removeSection).toHaveBeenCalledWith(CLASS_ID, SECTION_ID, lecturer)
    })

    it('propagates service errors', async () => {
      const error = new Error('section not found')
      service.removeSection.mockRejectedValue(error)

      await expect(controller.remove(CLASS_ID, SECTION_ID, lecturer)).rejects.toBe(error)
    })
  })

  describe('createItem', () => {
    it('creates an item in the section and returns the fresh list', async () => {
      const dto = { title: 'Slides' } as unknown as CreateSectionItemDto
      service.createItem.mockResolvedValue(views)

      await expect(controller.createItem(CLASS_ID, SECTION_ID, dto, lecturer)).resolves.toBe(views)
      expect(service.createItem).toHaveBeenCalledWith(CLASS_ID, SECTION_ID, dto, lecturer)
    })

    it('propagates service errors', async () => {
      const error = new Error('invalid item')
      service.createItem.mockRejectedValue(error)

      await expect(
        controller.createItem(
          CLASS_ID,
          SECTION_ID,
          {} as unknown as CreateSectionItemDto,
          lecturer,
        ),
      ).rejects.toBe(error)
    })
  })

  describe('reorderItems', () => {
    it('reorders the items of a section and returns the fresh list', async () => {
      const dto = { ids: ['i2', 'i1'] } as unknown as ReorderDto
      service.reorderItems.mockResolvedValue(views)

      await expect(controller.reorderItems(CLASS_ID, SECTION_ID, dto, lecturer)).resolves.toBe(
        views,
      )
      expect(service.reorderItems).toHaveBeenCalledWith(CLASS_ID, SECTION_ID, dto, lecturer)
    })

    it('propagates service errors', async () => {
      const error = new Error('bad order')
      service.reorderItems.mockRejectedValue(error)

      await expect(
        controller.reorderItems(CLASS_ID, SECTION_ID, { ids: [] } as unknown as ReorderDto, lecturer),
      ).rejects.toBe(error)
    })
  })

  describe('updateItem', () => {
    it('updates an item and returns the fresh list', async () => {
      const dto = { title: 'New title' } as unknown as UpdateSectionItemDto
      service.updateItem.mockResolvedValue(views)

      await expect(
        controller.updateItem(CLASS_ID, SECTION_ID, ITEM_ID, dto, lecturer),
      ).resolves.toBe(views)
      expect(service.updateItem).toHaveBeenCalledWith(CLASS_ID, SECTION_ID, ITEM_ID, dto, lecturer)
    })

    it('propagates service errors', async () => {
      const error = new Error('item not found')
      service.updateItem.mockRejectedValue(error)

      await expect(
        controller.updateItem(
          CLASS_ID,
          SECTION_ID,
          ITEM_ID,
          {} as unknown as UpdateSectionItemDto,
          lecturer,
        ),
      ).rejects.toBe(error)
    })
  })

  describe('removeItem', () => {
    it('removes an item and returns the fresh list', async () => {
      service.removeItem.mockResolvedValue(views)

      await expect(controller.removeItem(CLASS_ID, SECTION_ID, ITEM_ID, lecturer)).resolves.toBe(
        views,
      )
      expect(service.removeItem).toHaveBeenCalledWith(CLASS_ID, SECTION_ID, ITEM_ID, lecturer)
    })

    it('propagates service errors', async () => {
      const error = new Error('item not found')
      service.removeItem.mockRejectedValue(error)

      await expect(controller.removeItem(CLASS_ID, SECTION_ID, ITEM_ID, lecturer)).rejects.toBe(
        error,
      )
    })
  })
})