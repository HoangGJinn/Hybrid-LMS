import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Semester } from '../entities/semester.entity.js';

@Injectable()
export class SemesterRepository {
  constructor(
    @InjectRepository(Semester)
    private readonly repo: Repository<Semester>,
  ) {}

  async create(data: Partial<Semester>): Promise<Semester> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  /** The lower-cased codes from `codes` that already exist (compared ignoring case). */
  async findExistingCodes(codes: string[]): Promise<Set<string>> {
    if (codes.length === 0) return new Set();
    const rows = await this.repo
      .createQueryBuilder('s')
      .select('s.semesterCode', 'semesterCode')
      .where('LOWER(s.semesterCode) IN (:...codes)', {
        codes: codes.map((code) => code.toLowerCase()),
      })
      .getRawMany<{ semesterCode: string }>();
    return new Set(rows.map((row) => row.semesterCode.toLowerCase()));
  }

  /** Inserts all semesters in one statement, so either every one of them is created or none. */
  async createMany(data: Partial<Semester>[]): Promise<void> {
    if (data.length === 0) return;
    await this.repo.insert(data);
  }

  async findAll(): Promise<Semester[]> {
    return this.repo.find({ order: { startDate: 'DESC' } });
  }

  async findById(id: string): Promise<Semester | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findActive(now: Date = new Date()): Promise<Semester | null> {
    return this.repo
      .createQueryBuilder('s')
      .where('s.startDate <= :now AND s.endDate >= :now', { now })
      .orderBy('s.startDate', 'DESC')
      .getOne();
  }

  async findByCode(semesterCode: string): Promise<Semester | null> {
    return this.repo.findOne({ where: { semesterCode } });
  }

  async update(id: string, patch: Partial<Semester>): Promise<void> {
    await this.repo.update(id, patch);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
