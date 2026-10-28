import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from '../entities/class.entity.js';
import { ClassStudent } from '../entities/class-student.entity.js';

@Injectable()
export class ClassRepository {
  constructor(
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(ClassStudent)
    private readonly classStudentRepo: Repository<ClassStudent>,
  ) {}

  async create(data: Partial<Class>): Promise<Class> {
    const entity = this.classRepo.create(data);
    return this.classRepo.save(entity);
  }

  async findAll(filter?: {
    isActive?: boolean;
    semesterId?: string;
    subjectId?: string;
    search?: string;
  }): Promise<Class[]> {
    const qb = this.classRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.subject', 'subject')
      .leftJoinAndSelect('c.semester', 'semester')
      .leftJoinAndSelect('c.lecturer', 'lecturer')
      .leftJoinAndSelect('lecturer.user', 'lecturerUser')
      .orderBy('c.classCode', 'ASC');
    if (filter?.isActive !== undefined) {
      qb.andWhere('c.isActive = :isActive', { isActive: filter.isActive });
    }
    if (filter?.semesterId) {
      qb.andWhere('c.semesterId = :semesterId', {
        semesterId: filter.semesterId,
      });
    }
    if (filter?.subjectId) {
      qb.andWhere('c.subjectId = :subjectId', { subjectId: filter.subjectId });
    }
    if (filter?.search) {
      qb.andWhere('(c.name ILIKE :search OR c.classCode ILIKE :search)', {
        search: `%${filter.search}%`,
      });
    }
    return qb.getMany();
  }

  async findById(id: string): Promise<Class | null> {
    return this.classRepo.findOne({
      where: { id },
      relations: {
        subject: true,
        semester: true,
        lecturer: {
          user: true,
        },
      },
    });
  }

  async findByCode(classCode: string): Promise<Class | null> {
    return this.classRepo.findOne({ where: { classCode } });
  }

  async findByLecturerId(lecturerId: string): Promise<Class[]> {
    return this.classRepo.find({
      where: { lecturerId, isActive: true },
      relations: {
        subject: true,
        semester: true,
        lecturer: {
          user: true,
        },
      },
      order: { classCode: 'ASC' },
    });
  }

  async findByStudentId(studentId: string): Promise<Class[]> {
    const enrollments = await this.classStudentRepo.find({
      where: { studentId },
      relations: {
        class: {
          subject: true,
          semester: true,
          lecturer: {
            user: true,
          },
        },
      },
    });
    return enrollments
      .map((e) => e.class)
      .filter((c): c is Class => Boolean(c && c.isActive));
  }

  async countStudents(classId: string): Promise<number> {
    return this.classStudentRepo.count({ where: { classId } });
  }

  async countStudentsBatch(classIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (classIds.length === 0) return map;
    const counts = await this.classStudentRepo
      .createQueryBuilder('cs')
      .select('cs.class_id', 'classId')
      .addSelect('COUNT(cs.student_id)', 'count')
      .where('cs.class_id IN (:...classIds)', { classIds })
      .groupBy('cs.class_id')
      .getRawMany<{ classId: string; count: string }>();
    for (const id of classIds) map.set(id, 0);
    for (const c of counts) map.set(c.classId, parseInt(c.count, 10));
    return map;
  }

  async update(id: string, patch: Partial<Class>): Promise<void> {
    await this.classRepo.update(id, patch);
  }

  async delete(id: string): Promise<void> {
    await this.classRepo.delete(id);
  }

    async findEnrollments(classId: string): Promise<ClassStudent[]> {
    return this.classStudentRepo.find({
      where: { classId },
      relations: { student: { user: true } },
      order: { student: { studentCode: 'ASC' } },
    });
  }

  async isEnrolled(classId: string, studentId: string): Promise<boolean> {
    return this.classStudentRepo.exists({ where: { classId, studentId } });
  }
}
