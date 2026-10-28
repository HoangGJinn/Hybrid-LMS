import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Role } from '../../../common/enums/role.enum.js'
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import type { CreateSectionDto } from '../dto/create-section.dto.js'
import type { SaveSectionsDto } from '../dto/save-sections.dto.js'
import type { SectionItem } from '../entities/section-item.entity.js'
import type { Section } from '../entities/section.entity.js'
import { AcademicFacade } from '../../academic/facades/academic.facade.js'
import { SectionRepository } from '../repositories/section.repository.js'
import { SectionView } from '../types/section-view.type.js'
import { SectionService } from './section.service.js'

type Mock = ReturnType<typeof vi.fn>

const CLASS_ID = 'class-1'
const LECTURER_ID = 'lec-1'

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

function makeSaveDto(
  sections: { id: string; itemIds: string[] }[],
): SaveSectionsDto {
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
    replaceAll: Mock
  }
  let academicFacade: { assertCanViewClass: Mock; assertCanManageClass: Mock }
  let service: SectionService

  beforeEach(() => {
    repository = {
      findByClassId: vi.fn().mockResolvedValue(sectionRows),
      findItemsBySectionIds: vi.fn().mockResolvedValue(itemRows),
      findIdsOwnedByOtherClasses: vi.fn().mockResolvedValue([]),
      createAtEnd: vi.fn(),
      replaceAll: vi.fn().mockResolvedValue(undefined),
    }
    academicFacade = {
      assertCanViewClass: vi.fn().mockResolvedValue(undefined),
      assertCanManageClass: vi.fn().mockResolvedValue(undefined),
    }
    service = new SectionService(
      repository as unknown as SectionRepository,
      academicFacade as unknown as AcademicFacade,
    )
  })

  describe('findByClass', () => {
    it('checks view access, then returns sections with their items', async () => {
      const result = await service.findByClass(CLASS_ID, lecturer)

      expect(academicFacade.assertCanViewClass).toHaveBeenCalledWith(CLASS_ID, lecturer)
      expect(result).toEqual(expectedViews())
      expect(repository.findItemsBySectionIds).toHaveBeenCalledWith(['sec-1', 'sec-2'])
    })

    it('returns an empty list when the class has no sections', async () => {
      repository.findByClassId.mockResolvedValue([])
      repository.findItemsBySectionIds.mockResolvedValue([])

      await expect(service.findByClass(CLASS_ID, lecturer)).resolves.toEqual([])
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

  describe('saveAll', () => {
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

    it('propagates ForbiddenException when the user cannot manage the class', async () => {
      academicFacade.assertCanManageClass.mockRejectedValue(new ForbiddenException())

      await expect(service.saveAll(CLASS_ID, dto, student)).rejects.toBeInstanceOf(
        ForbiddenException,
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
  })
})