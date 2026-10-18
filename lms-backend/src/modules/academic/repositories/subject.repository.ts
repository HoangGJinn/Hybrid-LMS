import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from '../entities/subject.entity.js';

@Injectable()
export class SubjectRepository {
  constructor(
    @InjectRepository(Subject)
    private readonly repo: Repository<Subject>,
  ) {}

  async create(data: Partial<Subject>): Promise<Subject> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findAll(): Promise<Subject[]> {
    return this.repo.find({ order: { subjectCode: 'ASC' } });
  }

  async findById(id: string): Promise<Subject | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByCode(subjectCode: string): Promise<Subject | null> {
    return this.repo.findOne({ where: { subjectCode } });
  }

  async update(id: string, patch: Partial<Subject>): Promise<void> {
    await this.repo.update(id, patch);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
