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
