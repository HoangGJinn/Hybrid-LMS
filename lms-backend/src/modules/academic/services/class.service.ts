import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import {
  AuditAction,
  AuditCategory,
  AuditEntityType,
  AuditFacade,
  diffFields,
} from '../../../shared/audit/index.js';
import { ClassRepository } from '../repositories/class.repository.js';
import { ClassStudentRepository } from '../repositories/class-student.repository.js';
import { ClassAccessPolicy } from '../policies/class-access.policy.js';
import { SubjectService } from './subject.service.js';
import { SemesterService } from './semester.service.js';
import { CreateClassDto } from '../dto/create-class.dto.js';
import { UpdateClassDto } from '../dto/update-class.dto.js';
import { Class } from '../entities/class.entity.js';
import { ClassView } from '../types/class-view.type.js';
import { UserFacade } from '../../user/facades/user.facade.js';
import { Role } from '../../../common/enums/role.enum.js';
import { ClassmateView } from '../types/classmate-view.type.js';
import { RosterStudentView } from '../types/roster-student-view.type.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { PaginatedResult } from '../../../common/types/paginated-result.type.js';
import {
  DEFAULT_MY_CLASSES_LIMIT,
  QueryMyClassesDto,
} from '../dto/query-my-classes.dto.js';
@Injectable()
export class ClassService {
  constructor(
    private readonly classRepo: ClassRepository,
    private readonly subjectService: SubjectService,
    private readonly semesterService: SemesterService,
    private readonly userFacade: UserFacade,
    private readonly classStudentRepo: ClassStudentRepository,
    private readonly accessPolicy: ClassAccessPolicy,
    @Optional() private readonly auditFacade?: AuditFacade,
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
    const view = ClassView.fromEntity(reloaded, 0);
    await this.auditFacade?.record({
      category: AuditCategory.ADMIN,
      action: AuditAction.CLASS_CREATED,
      entityType: AuditEntityType.CLASS,
      entityId: view.id,
      entityLabel: `${view.classCode} — ${view.name}`,
      summary: `Created course ${view.classCode} — ${view.name}`,
      metadata: {
        subjectCode: view.subjectCode,
        semesterCode: view.semesterCode,
        lecturerId: view.lecturerId,
        lecturerName: view.lecturerName,
      },
    });
    return view;
  }

  async createClass(dto: CreateClassDto): Promise<ClassView> {
    return this.create(dto);
  }

  async findAll(filter?: {
    isActive?: boolean;
    isDeleted?: boolean;
    semesterId?: string;
    subjectId?: string;
    search?: string;
  }): Promise<ClassView[]> {
    const isDeleted = filter?.isDeleted ?? false;
    const classes = await this.classRepo.findAll({
      ...filter,
      isActive: isDeleted ? undefined : (filter?.isActive ?? true),
      isDeleted,
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

  async findMyClasses(
    userId: string,
    role: Role,
    query: QueryMyClassesDto,
  ): Promise<PaginatedResult<ClassView>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_MY_CLASSES_LIMIT;
    const [classes, total] = await this.classRepo.findMyClasses(
      userId,
      role,
      query,
    );
    const counts = await this.classRepo.countStudentsBatch(
      classes.map((c) => c.id),
    );
    const items = classes.map((c) =>
      ClassView.fromEntity(c, counts.get(c.id) ?? 0),
    );
    return PaginatedResult.of(items, total, page, limit);
  }

  async countStudents(classId: string): Promise<number> {
    return this.classRepo.countStudents(classId);
  }

  async countStudentsBatch(classIds: string[]): Promise<Map<string, number>> {
    return this.classRepo.countStudentsBatch(classIds);
  }

  async update(id: string, dto: UpdateClassDto): Promise<ClassView> {
    const cls = await this.findById(id);
    if (cls.deletedAt) {
      throw new ConflictException('Removed classes cannot be modified');
    }
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
    const view = ClassView.fromEntity(updated, count);
    if (this.auditFacade) {
      const beforeView = ClassView.fromEntity(cls, count);
      const changes = diffFields(
        {
          classCode: beforeView.classCode,
          name: beforeView.name,
          subjectCode: beforeView.subjectCode,
          semesterCode: beforeView.semesterCode,
          lecturerId: beforeView.lecturerId,
          lecturerName: beforeView.lecturerName,
        },
        {
          classCode: view.classCode,
          name: view.name,
          subjectCode: view.subjectCode,
          semesterCode: view.semesterCode,
          lecturerId: view.lecturerId,
          lecturerName: view.lecturerName,
        },
        [
          'classCode',
          'name',
          'subjectCode',
          'semesterCode',
          'lecturerId',
          'lecturerName',
        ],
      );
      if (changes) {
        await this.auditFacade.record({
          category: AuditCategory.ADMIN,
          action: AuditAction.CLASS_UPDATED,
          entityType: AuditEntityType.CLASS,
          entityId: view.id,
          entityLabel: `${view.classCode} — ${view.name}`,
          summary: `Updated course ${view.classCode} — ${view.name}`,
          changes,
        });
      }
    }
    return view;
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
    if (cls.deletedAt) {
      throw new ConflictException('Removed classes cannot be modified');
    }
    if (!cls.isActive) {
      throw new ConflictException('Class already deactivated');
    }
    await this.classRepo.update(id, { isActive: false, endedAt: new Date() });
    const updated = await this.findById(id);
    const count = await this.countStudents(id);
    const view = ClassView.fromEntity(updated, count);
    await this.auditFacade?.record({
      category: AuditCategory.ADMIN,
      action: AuditAction.CLASS_DEACTIVATED,
      entityType: AuditEntityType.CLASS,
      entityId: view.id,
      entityLabel: `${view.classCode} — ${view.name}`,
      summary: `Deactivated course ${view.classCode} — ${view.name}`,
      changes: { isActive: { from: true, to: false } },
      metadata: { endedAt: view.endedAt },
    });
    return view;
  }

  async deactivateClass(id: string): Promise<ClassView> {
    return this.deactivate(id);
  }

  async remove(id: string, actorId: string | null = null): Promise<ClassView> {
    const cls = await this.findById(id);
    if (cls.deletedAt) {
      throw new ConflictException('Class has already been permanently removed');
    }
    const now = new Date();
    await this.classRepo.update(id, {
      isActive: false,
      endedAt: cls.endedAt ?? now,
      deletedAt: now,
      deletedBy: actorId,
    });
    const updated = await this.findById(id);
    const count = await this.countStudents(id);
    const view = ClassView.fromEntity(updated, count);
    await this.auditFacade?.record({
      category: AuditCategory.ADMIN,
      action: AuditAction.CLASS_REMOVED,
      entityType: AuditEntityType.CLASS,
      entityId: view.id,
      entityLabel: `${view.classCode} — ${view.name}`,
      summary: `Permanently removed course ${view.classCode} — ${view.name}`,
      changes: {
        isActive: { from: cls.isActive, to: false },
        deletedAt: { from: null, to: view.deletedAt ?? null },
      },
      metadata: {
        classCode: view.classCode,
        name: view.name,
        lecturerName: view.lecturerName,
        studentCount: count,
      },
    });
    return view;
  }

  async getClassmates(
    classId: string,
    user: AuthenticatedUser,
  ): Promise<ClassmateView[]> {
    const cls = await this.findById(classId);
    await this.accessPolicy.assertCanView(cls, user);
    const enrollments = await this.classStudentRepo.findByClass(classId);
    return enrollments.map((e) => ClassmateView.fromEnrollment(e));
  }

  async getRoster(
    classId: string,
    user: AuthenticatedUser,
  ): Promise<RosterStudentView[]> {
    if (user.role === Role.STUDENT) {
      throw new ForbiddenException('Only lecturers can view the roster');
    }
    const cls = await this.findById(classId);
    await this.accessPolicy.assertCanView(cls, user);
    const enrollments = await this.classStudentRepo.findByClass(classId);
    return enrollments.map((e) => RosterStudentView.fromEnrollmentWithStats(e));
  }
}
