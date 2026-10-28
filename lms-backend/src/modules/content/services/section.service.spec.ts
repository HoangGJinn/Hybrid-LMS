import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import type { Section } from '../entities/section.entity.js'
import type { SectionRepository } from '../repositories/section.repository.js'
import { SectionService } from './section.service.js'

const inputClassId = 'class-1'
const inputDto = { title: 'Week 1' }
const mockLecturer = { id: 'lecturer-1', role: 'LECTURER' } as AuthenticatedUser
const mockSection = {
  id: 'section-1',
  classId: inputClassId,
  title: 'Week 1',
  orderIndex: 3,
} as Section

describe('SectionService.create', () => {
  const mockRepository = {
    findClassLecturerId: vi.fn(),
    findByClassId: vi.fn(),
    findItemsBySectionIds: vi.fn(),
    createAtEnd: vi.fn(),
  }
  let service: SectionService

  beforeEach(() => {
    vi.resetAllMocks()
    service = new SectionService(mockRepository as unknown as SectionRepository)
  })

  it('appends the section and returns its view', async () => {
    mockRepository.findClassLecturerId.mockResolvedValue('lecturer-1')
    mockRepository.createAtEnd.mockResolvedValue(mockSection)
    const actualResult = await service.create(inputClassId, inputDto, mockLecturer)
    expect(mockRepository.createAtEnd).toHaveBeenCalledWith(inputClassId, 'Week 1')
    expect(actualResult).toMatchObject({ id: 'section-1', orderIndex: 3, items: [] })
  })

  it('throws NotFound when the class does not exist', async () => {
    mockRepository.findClassLecturerId.mockResolvedValue(null)
    await expect(
      service.create(inputClassId, inputDto, mockLecturer),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('rejects a lecturer who does not teach the class', async () => {
    mockRepository.findClassLecturerId.mockResolvedValue('lecturer-2')
    await expect(
      service.create(inputClassId, inputDto, mockLecturer),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(mockRepository.createAtEnd).not.toHaveBeenCalled()
  })
})

describe('SectionService.findByClass', () => {
  const mockRepository = {
    findClassLecturerId: vi.fn(),
    findByClassId: vi.fn(),
    findItemsBySectionIds: vi.fn(),
    createAtEnd: vi.fn(),
  }

  it('returns sections in the order given by the repository', async () => {
    mockRepository.findClassLecturerId.mockResolvedValue('lecturer-1')
    mockRepository.findByClassId.mockResolvedValue([mockSection])
    mockRepository.findItemsBySectionIds.mockResolvedValue([])
    const service = new SectionService(mockRepository as unknown as SectionRepository)
    const actualResult = await service.findByClass(inputClassId, mockLecturer)
    expect(actualResult.map((section) => section.id)).toEqual(['section-1'])
  })
})
