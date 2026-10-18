import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassRepository } from '../repositories/class.repository.js';
import { SubjectService } from './subject.service.js';
import { SemesterService } from './semester.service.js';
import { CreateClassDto } from '../dto/create-class.dto.js';
import { UpdateClassDto } from '../dto/update-class.dto.js';
import { Class } from '../entities/class.entity.js';
import { ClassView } from '../types/class-view.type.js';
import { UserFacade } from '../../user/facades/user.facade.js';
import { Role } from '../../../common/enums/role.enum.js';

@Injectable()
export class ClassService {
  constructor(
    private readonly classRepo: ClassRepository,
    private readonly subjectService: SubjectService,
    private readonly semesterService: SemesterService,
    private readonly userFacade: UserFacade,
  ) {}

  private async validateSubject(subjectId: string): Promise<void> {
    try {
      await this.subjectService.findById(subjectId);
    } catch {
      throw new BadRequestException(
        `Subject with id '${subjectId}' does not exist`,
      );
    }
  }

  private async validateSemester(semesterId: string): Promise<void> {
    try {
      await this.semesterService.findById(semesterId);
    } catch {
      throw new BadRequestException(
        `Semester with id '${semesterId}' does not exist`,
      );
    }
  }

  private async validateLecturer(lecturerId: string): Promise<void> {
    try {
      const user = await this.userFacade.getUserById(lecturerId);
      if (user.role !== Role.LECTURER) {
        throw new BadRequestException(`User '${lecturerId}' is not a lecturer`);
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        `Lecturer with id '${lecturerId}' does not exist`,
      );
    }
  }

  async create(dto: CreateClassDto): Promise<ClassView> {
    const existing = await this.classRepo.findByCode(dto.classCode);
    if (existing) {
      throw new ConflictException(
        `Class code '${dto.classCode}' already exists`,
      );
    }
    await this.validateSubject(dto.subjectId);
    await this.validateSemester(dto.semesterId);
    await this.validateLecturer(dto.lecturerId);
    const saved = await this.classRepo.create(dto);
    const reloaded = await this.findById(saved.id);
    return ClassView.fromEntity(reloaded, 0);
  }

  async createClass(dto: CreateClassDto): Promise<ClassView> {
    return this.create(dto);
  }

  async findAll(filter?: {
    isActive?: boolean;
    semesterId?: string;
    subjectId?: string;
    search?: string;
  }): Promise<ClassView[]> {
    const isActive = filter?.isActive ?? true;
    const classes = await this.classRepo.findAll({
      ...filter,
      isActive,
    });
    const counts = await this.classRepo.countStudentsBatch(
      classes.map((c) => c.id),
    );
    return classes.map((c) => ClassView.fromEntity(c, counts.get(c.id) ?? 0));
  }

  async findById(id: string): Promise<Class> {
    const cls = await this.classRepo.findById(id);
    if (!cls) throw new NotFoundException(`Class with id '${id}' not found`);
    return cls;
  }

  async findOne(id: string): Promise<Class> {
    return this.findById(id);
  }

  async findByLecturer(lecturerId: string): Promise<Class[]> {
    return this.classRepo.findByLecturerId(lecturerId);
  }

  async findByStudent(studentId: string): Promise<Class[]> {
    return this.classRepo.findByStudentId(studentId);
  }

  async countStudents(classId: string): Promise<number> {
    return this.classRepo.countStudents(classId);
  }

  async countStudentsBatch(classIds: string[]): Promise<Map<string, number>> {
    return this.classRepo.countStudentsBatch(classIds);
  }

  async update(id: string, dto: UpdateClassDto): Promise<ClassView> {
    const cls = await this.findById(id);
    if (dto.classCode && dto.classCode !== cls.classCode) {
      const existing = await this.classRepo.findByCode(dto.classCode);
      if (existing) {
        throw new ConflictException(
          `Class code '${dto.classCode}' already exists`,
        );
      }
    }
    if (dto.subjectId) await this.validateSubject(dto.subjectId);
    if (dto.semesterId) await this.validateSemester(dto.semesterId);
    if (dto.lecturerId) await this.validateLecturer(dto.lecturerId);
    await this.classRepo.update(id, dto);
    const updated = await this.findById(id);
    const count = await this.countStudents(id);
    return ClassView.fromEntity(updated, count);
  }

  async updateClass(id: string, dto: UpdateClassDto): Promise<ClassView> {
    return this.update(id, dto);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.classRepo.delete(id);
  }

  async deactivate(id: string): Promise<ClassView> {
    const cls = await this.findById(id);
    if (!cls.isActive) {
      throw new ConflictException('Class already deactivated');
    }
    await this.classRepo.update(id, { isActive: false, endedAt: new Date() });
    const updated = await this.findById(id);
    const count = await this.countStudents(id);
    return ClassView.fromEntity(updated, count);
  }

  async deactivateClass(id: string): Promise<ClassView> {
    return this.deactivate(id);
  }
}
