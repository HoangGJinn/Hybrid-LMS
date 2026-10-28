import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Role } from '../../../common/enums/role.enum.js'
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import { AddParticipantsDto } from '../dto/add-participants.dto.js'
import { Class } from '../entities/class.entity.js'
import { ClassStudent } from '../entities/class-student.entity.js'
import { ParticipantRepository } from '../repositories/participant.repository.js'
import { ParticipantView } from '../types/participant-view.type.js'
import { StudentCandidateView } from '../types/student-candidate-view.type.js'
import { Student } from '../../user/entities/student.entity.js'
import { ClassService } from './class.service.js'
import { ParticipantService } from './participant.service.js'

const CLASS_ID = 'class-1'
const LECTURER_ID = 'lecturer-1'

const lecturer = { id: LECTURER_ID, role: Role.LECTURER } as unknown as AuthenticatedUser
const otherLecturer = { id: 'lecturer-2', role: Role.LECTURER } as unknown as AuthenticatedUser
const admin = { id: 'admin-1', role: Role.ADMIN } as unknown as AuthenticatedUser

const activeClass = { id: CLASS_ID, lecturerId: LECTURER_ID, isActive: true } as unknown as Class
const endedClass = { id: CLASS_ID, lecturerId: LECTURER_ID, isActive: false } as unknown as Class

describe('ParticipantService', () => {
  const participantRepo = {
    findByClassId: vi.fn(),
    findActiveStudentIds: vi.fn(),
    findEnrolledIds: vi.fn(),
    searchCandidates: vi.fn(),
    createMany: vi.fn(),
    delete: vi.fn(),
  }
  const classService = { findById: vi.fn() }
  let service: ParticipantService

  beforeEach(() => {
    vi.resetAllMocks()
    classService.findById.mockResolvedValue(activeClass)
    service = new ParticipantService(
      participantRepo as unknown as ParticipantRepository,
      classService as unknown as ClassService,
    )
  })

  describe('permission', () => {
    it('allows the lecturer who teaches the class', async () => {
      participantRepo.findByClassId.mockResolvedValue([])
      await expect(service.findAll(CLASS_ID, lecturer)).resolves.toEqual([])
    })

    it('allows an admin even when not the class lecturer', async () => {
      participantRepo.findByClassId.mockResolvedValue([])
      await expect(service.findAll(CLASS_ID, admin)).resolves.toEqual([])
    })

    it('rejects a lecturer who does not teach the class', async () => {
      await expect(service.findAll(CLASS_ID, otherLecturer)).rejects.toThrow(
        ForbiddenException,
      )
      expect(participantRepo.findByClassId).not.toHaveBeenCalled()
    })
  })

  describe('findAll', () => {
    it('maps enrollments to views', async () => {
      const enrollments = [{ studentId: 's1' }, { studentId: 's2' }] as unknown as ClassStudent[]
      participantRepo.findByClassId.mockResolvedValue(enrollments)
      const view = { studentId: 'view' } as unknown as ParticipantView
      const spy = vi.spyOn(ParticipantView, 'fromEntity').mockReturnValue(view)

      const result = await service.findAll(CLASS_ID, lecturer)

      expect(participantRepo.findByClassId).toHaveBeenCalledWith(CLASS_ID)
      expect(spy).toHaveBeenCalledTimes(2)
      expect(result).toEqual([view, view])
    })
  })

  describe('searchCandidates', () => {
    it('trims the search term and applies the candidate limit', async () => {
      participantRepo.searchCandidates.mockResolvedValue([{ studentCode: 'S001' }] as unknown as Student[])
      const view = { id: 'candidate' } as unknown as StudentCandidateView
      vi.spyOn(StudentCandidateView, 'fromEntity').mockReturnValue(view)

      const result = await service.searchCandidates(CLASS_ID, '  an  ', lecturer)

      expect(participantRepo.searchCandidates).toHaveBeenCalledWith(CLASS_ID, 'an', 20)
      expect(result).toEqual([view])
    })
  })

  describe('add', () => {
    const dto = { studentIds: ['s1', 's2', 's1'] } as unknown as AddParticipantsDto

    it('rejects when the class has ended', async () => {
      classService.findById.mockResolvedValue(endedClass)
      await expect(service.add(CLASS_ID, dto, lecturer)).rejects.toThrow(
        ConflictException,
      )
      expect(participantRepo.createMany).not.toHaveBeenCalled()
    })

    it('rejects ids that are not active students', async () => {
      participantRepo.findActiveStudentIds.mockResolvedValue(new Set(['s1']))
      await expect(service.add(CLASS_ID, dto, lecturer)).rejects.toThrow(
        BadRequestException,
      )
      expect(participantRepo.createMany).not.toHaveBeenCalled()
    })

    it('adds new students, de-duplicates ids and skips already enrolled', async () => {
      participantRepo.findActiveStudentIds.mockResolvedValue(new Set(['s1', 's2']))
      participantRepo.findEnrolledIds.mockResolvedValue(new Set(['s2']))

      const result = await service.add(CLASS_ID, dto, lecturer)

      expect(participantRepo.findActiveStudentIds).toHaveBeenCalledWith(['s1', 's2'])
      expect(participantRepo.createMany).toHaveBeenCalledWith(CLASS_ID, ['s1'])
      expect(result).toEqual({ added: 1, skipped: 1 })
    })

    it('reports everything skipped when all are already enrolled', async () => {
      participantRepo.findActiveStudentIds.mockResolvedValue(new Set(['s1', 's2']))
      participantRepo.findEnrolledIds.mockResolvedValue(new Set(['s1', 's2']))

      const result = await service.add(CLASS_ID, dto, lecturer)

      expect(participantRepo.createMany).toHaveBeenCalledWith(CLASS_ID, [])
      expect(result).toEqual({ added: 0, skipped: 2 })
    })
  })

  describe('remove', () => {
    it('removes an enrolled student', async () => {
      participantRepo.delete.mockResolvedValue(true)
      await expect(service.remove(CLASS_ID, 's1', lecturer)).resolves.toBeUndefined()
      expect(participantRepo.delete).toHaveBeenCalledWith(CLASS_ID, 's1')
    })

    it('rejects when the class has ended', async () => {
      classService.findById.mockResolvedValue(endedClass)
      await expect(service.remove(CLASS_ID, 's1', lecturer)).rejects.toThrow(
        ConflictException,
      )
      expect(participantRepo.delete).not.toHaveBeenCalled()
    })

    it('throws NotFound when the student is not enrolled', async () => {
      participantRepo.delete.mockResolvedValue(false)
      await expect(service.remove(CLASS_ID, 's1', lecturer)).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})