import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Role } from '../../../common/enums/role.enum.js'
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import type { CreateSectionDto } from '../dto/create-section.dto.js'
import type { SaveSectionsDto } from '../dto/save-sections.dto.js'
import type { SectionItem } from '../entities/section-item.entity.js'
import type { Section } from '../entities/section.entity.js'
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
const admin = makeUser('admin-1', Role.ADMIN)
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
    findClassLecturerId: Mock
    findByClassId: Mock
    findItemsBySectionIds: Mock
    findIdsOwnedByOtherClasses: Mock
    createAtEnd: Mock
    replaceAll: Mock
    isStudentEnrolled: Mock
  }
  let service: SectionService

  beforeEach(() => {
    repository = {
      findClassLecturerId: vi.fn().mockResolvedValue(LECTURER_ID),
      findByClassId: vi.fn().mockResolvedValue(sectionRows),
      findItemsBySectionIds: vi.fn().mockResolvedValue(itemRows),
      findIdsOwnedByOtherClasses: vi.fn().mockResolvedValue([]),
      createAtEnd: vi.fn(),
      replaceAll: vi.fn().mockResolvedValue(undefined),
      isStudentEnrolled: vi.fn().mockResolvedValue(false),
    }
    service = new SectionService(repository as unknown as SectionRepository)
  })

  describe('findByClass', () => {
    it('returns sections with their items for the class lecturer', async () => {
      const result = await service.findByClass(CLASS_ID, lecturer)

      expect(result).toEqual(expectedViews())
      expect(repository.findItemsBySectionIds).toHaveBeenCalledWith(['sec-1', 'sec-2'])
      expect(repository.isStudentEnrolled).not.toHaveBeenCalled()
    })

    it('allows an admin without checking enrollment', async () => {
      await expect(service.findByClass(CLASS_ID, admin)).resolves.toEqual(expectedViews())
      expect(repository.isStudentEnrolled).not.toHaveBeenCalled()
    })

    it('allows an enrolled student', async () => {
      repository.isStudentEnrolled.mockResolvedValue(true)

      await expect(service.findByClass(CLASS_ID, student)).resolves.toEqual(expectedViews())
      expect(repository.isStudentEnrolled).toHaveBeenCalledWith(CLASS_ID, student.id)
    })

    it('returns an empty list when the class has no sections', async () => {
      repository.findByClassId.mockResolvedValue([])
      repository.findItemsBySectionIds.mockResolvedValue([])

      await expect(service.findByClass(CLASS_ID, lecturer)).resolves.toEqual([])
    })

    it('throws NotFoundException when the class does not exist', async () => {
      repository.findClassLecturerId.mockResolvedValue(null)

      await expect(service.findByClass(CLASS_ID, lecturer)).rejects.toBeInstanceOf(
        NotFoundException,
      )
      expect(repository.findByClassId).not.toHaveBeenCalled()
    })

    it('throws ForbiddenException for a student who is not enrolled', async () => {
      await expect(service.findByClass(CLASS_ID, student)).rejects.toBeInstanceOf(
        ForbiddenException,
      )
      expect(repository.findByClassId).not.toHaveBeenCalled()
    })

    it('throws ForbiddenException for a lecturer of another class', async () => {
      await expect(service.findByClass(CLASS_ID, otherLecturer)).rejects.toBeInstanceOf(
        ForbiddenException,
      )
      expect(repository.isStudentEnrolled).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    const dto = { title: 'Week 3' } as unknown as CreateSectionDto

    it('appends a section and returns its view', async () => {
      const created = { id: 'sec-3', classId: CLASS_ID, title: 'Week 3', orderIndex: 3 }
      repository.createAtEnd.mockResolvedValue(created)

      const result = await service.create(CLASS_ID, dto, lecturer)

      expect(repository.createAtEnd).toHaveBeenCalledWith(CLASS_ID, 'Week 3')
      expect(result).toEqual(SectionView.fromEntity(created as unknown as Section))
    })

    it('throws NotFoundException when the class does not exist', async () => {
      repository.findClassLecturerId.mockResolvedValue(null)

      await expect(service.create(CLASS_ID, dto, lecturer)).rejects.toBeInstanceOf(
        NotFoundException,
      )
      expect(repository.createAtEnd).not.toHaveBeenCalled()
    })

    it('throws ForbiddenException when the user does not teach the class', async () => {
      await expect(service.create(CLASS_ID, dto, otherLecturer)).rejects.toBeInstanceOf(
        ForbiddenException,
      )
      expect(repository.createAtEnd).not.toHaveBeenCalled()
    })

    it('does not let an admin who is not the lecturer edit the class', async () => {
      await expect(service.create(CLASS_ID, dto, admin)).rejects.toBeInstanceOf(
        ForbiddenException,
      )
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

    it('throws NotFoundException when the class does not exist', async () => {
      repository.findClassLecturerId.mockResolvedValue(null)

      await expect(service.saveAll(CLASS_ID, dto, lecturer)).rejects.toBeInstanceOf(
        NotFoundException,
      )
      expect(repository.replaceAll).not.toHaveBeenCalled()
    })

    it('throws ForbiddenException when the user does not teach the class', async () => {
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