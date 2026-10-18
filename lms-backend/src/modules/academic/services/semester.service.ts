import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SemesterRepository } from '../repositories/semester.repository.js';
import { CreateSemesterDto } from '../dto/create-semester.dto.js';
import { UpdateSemesterDto } from '../dto/update-semester.dto.js';
import { Semester } from '../entities/semester.entity.js';

@Injectable()
export class SemesterService {
  constructor(private readonly semesterRepo: SemesterRepository) {}

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
    return this.semesterRepo.create({
      semesterCode: dto.semesterCode,
      name: dto.name,
      startDate: start,
      endDate: end,
    });
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
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.semesterRepo.delete(id);
  }
}
