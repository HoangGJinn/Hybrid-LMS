import {
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
import { SubjectRepository } from '../repositories/subject.repository.js';
import { CreateSubjectDto } from '../dto/create-subject.dto.js';
import { UpdateSubjectDto } from '../dto/update-subject.dto.js';
import { Subject } from '../entities/subject.entity.js';

@Injectable()
export class SubjectService {
  constructor(
    private readonly subjectRepo: SubjectRepository,
    @Optional() private readonly auditFacade?: AuditFacade,
  ) {}

  async create(dto: CreateSubjectDto): Promise<Subject> {
    const existing = await this.subjectRepo.findByCode(dto.subjectCode);
    if (existing)
      throw new ConflictException(
        `Subject code '${dto.subjectCode}' already exists`,
      );
    const created = await this.subjectRepo.create(dto);
    await this.auditFacade?.record({
      category: AuditCategory.ADMIN,
      action: AuditAction.SUBJECT_CREATED,
      entityType: AuditEntityType.SUBJECT,
      entityId: created.id,
      entityLabel: `${created.subjectCode} — ${created.name}`,
      summary: `Created subject ${created.subjectCode} — ${created.name}`,
      metadata: { subjectCode: created.subjectCode, name: created.name },
    });
    return created;
  }

  async findAll(): Promise<Subject[]> {
    return this.subjectRepo.findAll();
  }

  async findById(id: string): Promise<Subject> {
    const subject = await this.subjectRepo.findById(id);
    if (!subject)
      throw new NotFoundException(`Subject with id '${id}' not found`);
    return subject;
  }

  async update(id: string, dto: UpdateSubjectDto): Promise<Subject> {
    const subject = await this.findById(id);
    if (dto.subjectCode && dto.subjectCode !== subject.subjectCode) {
      const existing = await this.subjectRepo.findByCode(dto.subjectCode);
      if (existing)
        throw new ConflictException(
          `Subject code '${dto.subjectCode}' already exists`,
        );
    }
    await this.subjectRepo.update(id, dto);
    const updated = await this.findById(id);
    if (this.auditFacade) {
      const changes = diffFields(
        {
          subjectCode: subject.subjectCode,
          name: subject.name,
          description: subject.description,
        },
        {
          subjectCode: updated.subjectCode,
          name: updated.name,
          description: updated.description,
        },
        ['subjectCode', 'name', 'description'],
      );
      if (changes) {
        await this.auditFacade.record({
          category: AuditCategory.ADMIN,
          action: AuditAction.SUBJECT_UPDATED,
          entityType: AuditEntityType.SUBJECT,
          entityId: updated.id,
          entityLabel: `${updated.subjectCode} — ${updated.name}`,
          summary: `Updated subject ${updated.subjectCode} — ${updated.name}`,
          changes,
        });
      }
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const subject = await this.findById(id);
    await this.subjectRepo.delete(id);
    await this.auditFacade?.record({
      category: AuditCategory.ADMIN,
      action: AuditAction.SUBJECT_DELETED,
      entityType: AuditEntityType.SUBJECT,
      entityId: subject.id,
      entityLabel: `${subject.subjectCode} — ${subject.name}`,
      summary: `Deleted subject ${subject.subjectCode} — ${subject.name}`,
      metadata: {
        subjectCode: subject.subjectCode,
        name: subject.name,
      },
    });
  }
}
