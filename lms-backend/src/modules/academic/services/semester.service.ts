import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  AuditAction,
  AuditCategory,
  AuditEntityType,
  AuditFacade,
  diffFields,
} from '../../../shared/audit/index.js';
import { SemesterRepository } from '../repositories/semester.repository.js';
import { CreateSemesterDto } from '../dto/create-semester.dto.js';
import { UpdateSemesterDto } from '../dto/update-semester.dto.js';
import { Semester } from '../entities/semester.entity.js';

@Injectable()
export class SemesterService {
  constructor(
    private readonly semesterRepo: SemesterRepository,
    @Optional() private readonly auditFacade?: AuditFacade,
  ) {}

  async create(dto: CreateSemesterDto): Promise<Semester> {
    const existing = await this.semesterRepo.findByCode(dto.semesterCode);
    if (existing)
      throw new ConflictException(
        `Semester code '${dto.semesterCode}' already exists`,
      );
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start >= end)
      throw new BadRequestException('startDate must be before endDate');
    const created = await this.semesterRepo.create({
      semesterCode: dto.semesterCode,
      name: dto.name,
      startDate: start,
      endDate: end,
    });
    await this.auditFacade?.record({
      category: AuditCategory.ADMIN,
      action: AuditAction.SEMESTER_CREATED,
      entityType: AuditEntityType.SEMESTER,
      entityId: created.id,
      entityLabel: `${created.semesterCode} — ${created.name}`,
      summary: `Created semester ${created.semesterCode} — ${created.name}`,
      metadata: {
        semesterCode: created.semesterCode,
        startDate: created.startDate,
        endDate: created.endDate,
      },
    });
    return created;
  }

  async createSemester(dto: CreateSemesterDto): Promise<Semester> {
    return this.create(dto);
  }

  async getActiveSemester(): Promise<Semester | null> {
    return this.semesterRepo.findActive();
  }

  async findAll(): Promise<Semester[]> {
    return this.semesterRepo.findAll();
  }

  async findById(id: string): Promise<Semester> {
    const semester = await this.semesterRepo.findById(id);
    if (!semester)
      throw new NotFoundException(`Semester with id '${id}' not found`);
    return semester;
  }

  async update(id: string, dto: UpdateSemesterDto): Promise<Semester> {
    const semester = await this.findById(id);
    if (dto.semesterCode && dto.semesterCode !== semester.semesterCode) {
      const existing = await this.semesterRepo.findByCode(dto.semesterCode);
      if (existing)
        throw new ConflictException(
          `Semester code '${dto.semesterCode}' already exists`,
        );
    }
    const start = dto.startDate ? new Date(dto.startDate) : semester.startDate;
    const end = dto.endDate ? new Date(dto.endDate) : semester.endDate;
    if (start >= end)
      throw new BadRequestException('startDate must be before endDate');
    await this.semesterRepo.update(id, {
      ...dto,
      startDate: dto.startDate ? start : undefined,
      endDate: dto.endDate ? end : undefined,
    });
    const updated = await this.findById(id);
    if (this.auditFacade) {
      const changes = diffFields(
        {
          semesterCode: semester.semesterCode,
          name: semester.name,
          startDate: semester.startDate,
          endDate: semester.endDate,
        },
        {
          semesterCode: updated.semesterCode,
          name: updated.name,
          startDate: updated.startDate,
          endDate: updated.endDate,
        },
        ['semesterCode', 'name', 'startDate', 'endDate'],
      );
      if (changes) {
        await this.auditFacade.record({
          category: AuditCategory.ADMIN,
          action: AuditAction.SEMESTER_UPDATED,
          entityType: AuditEntityType.SEMESTER,
          entityId: updated.id,
          entityLabel: `${updated.semesterCode} — ${updated.name}`,
          summary: `Updated semester ${updated.semesterCode} — ${updated.name}`,
          changes,
        });
      }
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const semester = await this.findById(id);
    await this.semesterRepo.delete(id);
    await this.auditFacade?.record({
      category: AuditCategory.ADMIN,
      action: AuditAction.SEMESTER_DELETED,
      entityType: AuditEntityType.SEMESTER,
      entityId: semester.id,
      entityLabel: `${semester.semesterCode} — ${semester.name}`,
      summary: `Deleted semester ${semester.semesterCode} — ${semester.name}`,
      metadata: {
        semesterCode: semester.semesterCode,
        name: semester.name,
      },
    });
  }
}
