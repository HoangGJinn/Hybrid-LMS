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

  /** The lower-cased codes from `codes` that already exist (compared ignoring case). */
  async findExistingCodes(codes: string[]): Promise<Set<string>> {
    if (codes.length === 0) return new Set();
    const rows = await this.repo
      .createQueryBuilder('s')
      .select('s.subjectCode', 'subjectCode')
      .where('LOWER(s.subjectCode) IN (:...codes)', {
        codes: codes.map((code) => code.toLowerCase()),
      })
      .getRawMany<{ subjectCode: string }>();
    return new Set(rows.map((row) => row.subjectCode.toLowerCase()));
  }

  /** Inserts all subjects in one statement, so either every one of them is created or none. */
  async createMany(data: Partial<Subject>[]): Promise<void> {
    if (data.length === 0) return;
    await this.repo.insert(data);
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
