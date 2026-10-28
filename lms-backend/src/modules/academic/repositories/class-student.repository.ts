import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassStudent } from '../entities/class-student.entity.js';
import { escapeLike } from '../../../common/utils/sql.util.js';

/** Encapsulates the enrolment table `class_students` (who takes which class). */
@Injectable()
export class ClassStudentRepository {
  constructor(
    @InjectRepository(ClassStudent)
    private readonly classStudentRepo: Repository<ClassStudent>,
  ) {}

  /** Participants of a class with their student profile and user, ordered by student code. */
  async findByClass(classId: string, search?: string): Promise<ClassStudent[]> {
    const query = this.classStudentRepo
      .createQueryBuilder('cs')
      .innerJoinAndSelect('cs.student', 'student')
      .innerJoinAndSelect('student.user', 'user')
      .where('cs.classId = :classId', { classId })
      .orderBy('student.studentCode', 'ASC');
    if (search) {
      query.andWhere(
        '(user.fullName ILIKE :search OR user.email ILIKE :search OR student.studentCode ILIKE :search)',
        { search: `%${escapeLike(search)}%` },
      );
    }
    return query.getMany();
  }

  async findOne(
    classId: string,
    studentId: string,
  ): Promise<ClassStudent | null> {
    return this.classStudentRepo.findOne({
      where: { classId, studentId },
      relations: { student: { user: true } },
    });
  }

  async exists(classId: string, studentId: string): Promise<boolean> {
    const count = await this.classStudentRepo.count({
      where: { classId, studentId },
    });
    return count > 0;
  }

  /** `user.id` of every student already in the class. */
  async findStudentIds(classId: string): Promise<Set<string>> {
    const rows = await this.classStudentRepo.find({
      where: { classId },
      select: { studentId: true },
    });
    return new Set(rows.map((row) => row.studentId));
  }

  /** Fails with a unique violation when the student is already in the class. */
  async add(classId: string, studentId: string): Promise<void> {
    await this.classStudentRepo.insert({ classId, studentId });
  }

  /** Adds many students in one statement; students that are already in the class are left alone. */
  async addMany(classId: string, studentIds: string[]): Promise<void> {
    if (studentIds.length === 0) return;
    await this.classStudentRepo
      .createQueryBuilder()
      .insert()
      .into(ClassStudent)
      .values(studentIds.map((studentId) => ({ classId, studentId })))
      .orIgnore()
      .execute();
  }

  /** Returns false when the student was not in the class. */
  async remove(classId: string, studentId: string): Promise<boolean> {
    const result = await this.classStudentRepo.delete({ classId, studentId });
    return (result.affected ?? 0) > 0;
  }
}
