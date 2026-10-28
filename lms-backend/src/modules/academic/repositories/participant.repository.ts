import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { ClassStudent } from '../entities/class-student.entity.js'
import { Student } from '../../user/entities/student.entity.js'

@Injectable()
export class ParticipantRepository {
  constructor(
    @InjectRepository(ClassStudent)
    private readonly classStudentRepo: Repository<ClassStudent>,
  ) {}

  async findByClassId(classId: string): Promise<ClassStudent[]> {
    return this.classStudentRepo.find({
      where: { classId },
      relations: { student: { user: true } },
      order: { student: { studentCode: 'ASC' } },
    })
  }

  /** Returns the subset of `ids` that are existing, active students. */
  async findActiveStudentIds(ids: string[]): Promise<Set<string>> {
    const rows = await this.classStudentRepo.manager
      .createQueryBuilder(Student, 's')
      .innerJoin('s.user', 'u')
      .select('u.id', 'id')
      .where('u.id IN (:...ids)', { ids })
      .andWhere('u.isActive = true')
      .getRawMany<{ id: string }>()
    return new Set(rows.map((r) => r.id))
  }

  async findEnrolledIds(classId: string, ids: string[]): Promise<Set<string>> {
    const rows = await this.classStudentRepo.find({
      where: { classId, studentId: In(ids) },
      select: { classId: true, studentId: true },
    })
    return new Set(rows.map((r) => r.studentId))
  }

  /** Active students not yet in the class; an empty term lists the first `limit`. */
  async searchCandidates(
    classId: string,
    term: string,
    limit: number,
  ): Promise<Student[]> {
    return this.classStudentRepo.manager
      .createQueryBuilder(Student, 's')
      .innerJoinAndSelect('s.user', 'u')
      .where('u.isActive = true')
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM class_students cs WHERE cs.class_id = :classId AND cs.student_id = u.id)',
        { classId },
      )
      .andWhere(
        '(u.fullName ILIKE :term OR u.email ILIKE :term OR s.studentCode ILIKE :term)',
        { term: `%${term}%` },
      )
      .orderBy('s.studentCode', 'ASC')
      .take(limit)
      .getMany()
  }

  async createMany(classId: string, studentIds: string[]): Promise<void> {
    if (studentIds.length === 0) return
    await this.classStudentRepo
      .createQueryBuilder()
      .insert()
      .into(ClassStudent)
      .values(studentIds.map((studentId) => ({ classId, studentId })))
      .orIgnore()
      .execute()
  }

  /** Returns false when the student was not enrolled. */
  async delete(classId: string, studentId: string): Promise<boolean> {
    const result = await this.classStudentRepo.delete({ classId, studentId })
    return (result.affected ?? 0) > 0
  }
}