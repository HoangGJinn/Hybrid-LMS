import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import { CreateSectionDto } from '../dto/create-section.dto.js'
import { SaveSectionsDto } from '../dto/save-sections.dto.js'
import { SectionService } from '../services/section.service.js'
import { SectionController } from './section.controller.js'

const user = { id: 'user-1' } as AuthenticatedUser

describe('SectionController', () => {
  const sectionService = {
    findByClass: vi.fn(),
    create: vi.fn(),
    saveAll: vi.fn(),
  }
  let controller: SectionController

  beforeEach(() => {
    vi.resetAllMocks()
    controller = new SectionController(sectionService as unknown as SectionService)
  })

  it('findAll delegates to findByClass', async () => {
    sectionService.findByClass.mockResolvedValue([{ id: 'sec-1' }])
    await expect(controller.findAll('class-1', user)).resolves.toEqual([{ id: 'sec-1' }])
    expect(sectionService.findByClass).toHaveBeenCalledWith('class-1', user)
  })

  it('create delegates to the service', async () => {
    const dto = { title: 'Week 1' } as CreateSectionDto
    sectionService.create.mockResolvedValue({ id: 'sec-1' })
    await expect(controller.create('class-1', dto, user)).resolves.toEqual({ id: 'sec-1' })
    expect(sectionService.create).toHaveBeenCalledWith('class-1', dto, user)
  })

  it('saveAll delegates to the service', async () => {
    const dto = { sections: [] } as unknown as SaveSectionsDto
    sectionService.saveAll.mockResolvedValue([])
    await expect(controller.saveAll('class-1', dto, user)).resolves.toEqual([])
    expect(sectionService.saveAll).toHaveBeenCalledWith('class-1', dto, user)
  })
})