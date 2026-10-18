import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SubjectRepository } from '../repositories/subject.repository.js';
import { CreateSubjectDto } from '../dto/create-subject.dto.js';
import { UpdateSubjectDto } from '../dto/update-subject.dto.js';
import { Subject } from '../entities/subject.entity.js';

@Injectable()
export class SubjectService {
  constructor(private readonly subjectRepo: SubjectRepository) {}

  async create(dto: CreateSubjectDto): Promise<Subject> {
    const existing = await this.subjectRepo.findByCode(dto.subjectCode);
    if (existing)
      throw new ConflictException(
        `Subject code '${dto.subjectCode}' already exists`,
      );
    return this.subjectRepo.create(dto);
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
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.subjectRepo.delete(id);
  }
}
