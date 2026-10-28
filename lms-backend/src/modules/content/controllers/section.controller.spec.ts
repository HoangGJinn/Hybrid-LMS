import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Role } from '../../../common/enums/role.enum.js'
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import type { CreateSectionDto } from '../dto/create-section.dto.js'
import type { SaveSectionsDto } from '../dto/save-sections.dto.js'
import { SectionService } from '../services/section.service.js'
import type { SectionView } from '../types/section-view.type.js'
import { SectionController } from './section.controller.js'

type Mock = ReturnType<typeof vi.fn>

const CLASS_ID = '3f2b6c1e-8d4a-4e5b-9c7a-1a2b3c4d5e6f'
const user = { id: 'lec-1', role: Role.LECTURER } as unknown as AuthenticatedUser

describe('SectionController', () => {
  let service: { findByClass: Mock; create: Mock; saveAll: Mock }
  let controller: SectionController

  beforeEach(() => {
    service = { findByClass: vi.fn(), create: vi.fn(), saveAll: vi.fn() }
    controller = new SectionController(service as unknown as SectionService)
  })

  describe('findAll', () => {
    it('returns the sections of the class from the service', async () => {
      const views = [{ id: 'sec-1' }] as unknown as SectionView[]
      service.findByClass.mockResolvedValue(views)

      await expect(controller.findAll(CLASS_ID, user)).resolves.toBe(views)
      expect(service.findByClass).toHaveBeenCalledWith(CLASS_ID, user)
    })

    it('propagates service errors', async () => {
      const error = new Error('forbidden')
      service.findByClass.mockRejectedValue(error)

      await expect(controller.findAll(CLASS_ID, user)).rejects.toBe(error)
    })
  })

  describe('create', () => {
    it('creates a section through the service', async () => {
      const dto = { title: 'Week 1' } as unknown as CreateSectionDto
      const view = { id: 'sec-1' } as unknown as SectionView
      service.create.mockResolvedValue(view)

      await expect(controller.create(CLASS_ID, dto, user)).resolves.toBe(view)
      expect(service.create).toHaveBeenCalledWith(CLASS_ID, dto, user)
    })

    it('propagates service errors', async () => {
      const error = new Error('not found')
      service.create.mockRejectedValue(error)

      await expect(
        controller.create(CLASS_ID, { title: 'x' } as unknown as CreateSectionDto, user),
      ).rejects.toBe(error)
    })
  })

  describe('saveAll', () => {
    it('saves the whole editor state through the service', async () => {
      const dto = { sections: [] } as unknown as SaveSectionsDto
      const views = [{ id: 'sec-1' }] as unknown as SectionView[]
      service.saveAll.mockResolvedValue(views)

      await expect(controller.saveAll(CLASS_ID, dto, user)).resolves.toBe(views)
      expect(service.saveAll).toHaveBeenCalledWith(CLASS_ID, dto, user)
    })

    it('propagates service errors', async () => {
      const error = new Error('bad request')
      service.saveAll.mockRejectedValue(error)

      await expect(
        controller.saveAll(CLASS_ID, { sections: [] } as unknown as SaveSectionsDto, user),
      ).rejects.toBe(error)
    })
  })
})