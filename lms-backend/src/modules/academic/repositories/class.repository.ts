import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from '../entities/class.entity.js';
import { ClassStudent } from '../entities/class-student.entity.js';
import { Role } from '../../../common/enums/role.enum.js';
import {
  DEFAULT_MY_CLASSES_LIMIT,
  QueryMyClassesDto,
} from '../dto/query-my-classes.dto.js';

@Injectable()
export class ClassRepository {
  constructor(
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(ClassStudent)
    private readonly classStudentRepo: Repository<ClassStudent>,
  ) { }

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
      .filter((c): c is Class => Boolean(c?.isActive));
  }

  async findMyClasses(
    userId: string,
    role: Role,
    query: QueryMyClassesDto,
  ): Promise<[Class[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_MY_CLASSES_LIMIT;
    const skip = (page - 1) * limit;

    const qb = this.classRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.subject', 'subject')
      .leftJoinAndSelect('c.semester', 'semester')
      .leftJoinAndSelect('c.lecturer', 'lecturer')
      .leftJoinAndSelect('lecturer.user', 'lecturerUser');

    if (role === Role.STUDENT) {
      qb.innerJoin(
        ClassStudent,
        'cs',
        'cs.classId = c.id AND cs.studentId = :studentId',
        { studentId: userId },
      );
    } else if (role === Role.LECTURER) {
      qb.andWhere('c.lecturerId = :lecturerId', { lecturerId: userId });
    }

    if (query.search?.trim()) {
      qb.andWhere('(c.name ILIKE :search OR c.classCode ILIKE :search)', {
        search: `%${query.search.trim()}%`,
      });
    }

    const now = new Date();
    if (query.status === 'in_progress') {
      qb.andWhere('c.isActive = true');
      qb.andWhere(
        '(semester.endDate IS NULL OR semester.endDate >= :now) AND (semester.startDate IS NULL OR semester.startDate <= :now)',
        { now },
      );
    } else if (query.status === 'future') {
      qb.andWhere('c.isActive = true');
      qb.andWhere(
        'semester.startDate IS NOT NULL AND semester.startDate > :now',
        { now },
      );
    } else if (query.status === 'past') {
      qb.andWhere(
        '(c.isActive = false OR (semester.endDate IS NOT NULL AND semester.endDate < :now))',
        { now },
      );
    }

    if (query.sort === 'name') {
      qb.orderBy('c.name', 'ASC').addOrderBy('c.classCode', 'ASC');
    } else {
      qb.orderBy('c.classCode', 'DESC').addOrderBy('c.name', 'ASC');
    }

    qb.skip(skip).take(limit);

    return qb.getManyAndCount();
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
}
