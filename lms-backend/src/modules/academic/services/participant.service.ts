import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ParticipantRepository } from '../repositories/participant.repository.js'
import { ClassService } from './class.service.js'
import { Class } from '../entities/class.entity.js'
import { AddParticipantsDto } from '../dto/add-participants.dto.js'
import { ParticipantView } from '../types/participant-view.type.js'
import { StudentCandidateView } from '../types/student-candidate-view.type.js'
import { AddStudentsResult } from '../types/add-students-result.type.js'
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import { Role } from '../../../common/enums/role.enum.js'

const CANDIDATE_LIMIT = 20

@Injectable()
export class ParticipantService {
  constructor(
    private readonly participantRepo: ParticipantRepository,
    private readonly classService: ClassService,
  ) {}

  /** Admins manage any class; a lecturer only the classes they teach. */
  private async assertCanManage(
    classId: string,
    actor: AuthenticatedUser,
  ): Promise<Class> {
    const cls = await this.classService.findById(classId)
    if (actor.role !== Role.ADMIN && cls.lecturerId !== actor.id) {
      throw new ForbiddenException('You do not teach this class')
    }
    return cls
  }

  private assertActive(cls: Class): void {
    if (!cls.isActive) {
      throw new ConflictException('Cannot change students of an ended class')
    }
  }

  async findAll(
    classId: string,
    actor: AuthenticatedUser,
  ): Promise<ParticipantView[]> {
    await this.assertCanManage(classId, actor)
    const enrollments = await this.participantRepo.findByClassId(classId)
    return enrollments.map((e) => ParticipantView.fromEntity(e))
  }

  async searchCandidates(
    classId: string,
    search: string,
    actor: AuthenticatedUser,
  ): Promise<StudentCandidateView[]> {
    await this.assertCanManage(classId, actor)
    const students = await this.participantRepo.searchCandidates(
      classId,
      search.trim(),
      CANDIDATE_LIMIT,
    )
    return students.map((s) => StudentCandidateView.fromEntity(s))
  }

  async add(
    classId: string,
    dto: AddParticipantsDto,
    actor: AuthenticatedUser,
  ): Promise<AddStudentsResult> {
    const cls = await this.assertCanManage(classId, actor)
    this.assertActive(cls)
    const ids = [...new Set(dto.studentIds)]
    const valid = await this.participantRepo.findActiveStudentIds(ids)
    const unknown = ids.filter((id) => !valid.has(id))
    if (unknown.length > 0) {
      throw new BadRequestException(`Not active students: ${unknown.join(', ')}`)
    }
    const enrolled = await this.participantRepo.findEnrolledIds(classId, ids)
    const toAdd = ids.filter((id) => !enrolled.has(id))
    await this.participantRepo.createMany(classId, toAdd)
    return { added: toAdd.length, skipped: ids.length - toAdd.length }
  }

  async remove(
    classId: string,
    studentId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const cls = await this.assertCanManage(classId, actor)
    this.assertActive(cls)
    const removed = await this.participantRepo.delete(classId, studentId)
    if (!removed) {
      throw new NotFoundException('Student is not enrolled in this class')
    }
  }
}