import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SemesterService } from './semester.service.js';
import { SemesterRepository } from '../repositories/semester.repository.js';
import { Semester } from '../entities/semester.entity.js';

describe('SemesterService', () => {
  let service: SemesterService;
  let mockRepo: Partial<Record<keyof SemesterRepository, ReturnType<typeof vi.fn>>>;

  const sampleSemester: Semester = {
    id: 'sem-uuid-1',
    semesterCode: 'HK1-2026',
    name: 'Học kỳ 1 - 2026',
    startDate: new Date('2026-09-01'),
    endDate: new Date('2026-12-31'),
  };

  beforeEach(() => {
    mockRepo = {
      findByCode: vi.fn(),
      findActive: vi.fn(),
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new SemesterService(mockRepo as unknown as SemesterRepository);
  });

  describe('create', () => {
    it('creates semester successfully', async () => {
      mockRepo.findByCode!.mockResolvedValue(null);
      mockRepo.create!.mockResolvedValue(sampleSemester);

      const dto = {
        semesterCode: 'HK1-2026',
        name: 'Học kỳ 1 - 2026',
        startDate: '2026-09-01',
        endDate: '2026-12-31',
      };
      const result = await service.create(dto);
      expect(mockRepo.create).toHaveBeenCalled();
      expect(result).toEqual(sampleSemester);
    });

    it('throws ConflictException if semesterCode already exists', async () => {
      mockRepo.findByCode!.mockResolvedValue(sampleSemester);

      await expect(
        service.create({
          semesterCode: 'HK1-2026',
          name: 'Another Semester',
          startDate: '2026-09-01',
          endDate: '2026-12-31',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException if startDate >= endDate', async () => {
      mockRepo.findByCode!.mockResolvedValue(null);

      await expect(
        service.create({
          semesterCode: 'HK1-2026',
          name: 'Invalid Dates',
          startDate: '2026-12-31',
          endDate: '2026-09-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('returns all semesters', async () => {
      mockRepo.findAll!.mockResolvedValue([sampleSemester]);
      const result = await service.findAll();
      expect(result).toEqual([sampleSemester]);
    });
  });

  describe('findById', () => {
    it('returns semester if found', async () => {
      mockRepo.findById!.mockResolvedValue(sampleSemester);
      const result = await service.findById('sem-uuid-1');
      expect(result).toEqual(sampleSemester);
    });

    it('throws NotFoundException if not found', async () => {
      mockRepo.findById!.mockResolvedValue(null);
      await expect(service.findById('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getActiveSemester', () => {
    it('returns active semester', async () => {
      mockRepo.findActive!.mockResolvedValue(sampleSemester);
      const result = await service.getActiveSemester();
      expect(result).toEqual(sampleSemester);
    });
  });

  describe('update', () => {
    it('updates semester successfully', async () => {
      const updated = { ...sampleSemester, name: 'Updated Semester' };
      mockRepo.findById!
        .mockResolvedValueOnce(sampleSemester)
        .mockResolvedValueOnce(updated);
      mockRepo.update!.mockResolvedValue(undefined);

      const result = await service.update('sem-uuid-1', {
        name: 'Updated Semester',
      });
      expect(result).toEqual(updated);
    });

    it('throws ConflictException if code changes to an existing code', async () => {
      mockRepo.findById!.mockResolvedValue(sampleSemester);
      mockRepo.findByCode!.mockResolvedValue({
        id: 'other-sem',
        semesterCode: 'HK2-2026',
      });

      await expect(
        service.update('sem-uuid-1', { semesterCode: 'HK2-2026' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException if updated dates are invalid', async () => {
      mockRepo.findById!.mockResolvedValue(sampleSemester);
      await expect(
        service.update('sem-uuid-1', {
          startDate: '2027-01-01',
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('deletes semester if found', async () => {
      mockRepo.findById!.mockResolvedValue(sampleSemester);
      mockRepo.delete!.mockResolvedValue(undefined);

      await expect(service.delete('sem-uuid-1')).resolves.toBeUndefined();
      expect(mockRepo.delete).toHaveBeenCalledWith('sem-uuid-1');
    });

    it('throws NotFoundException if not found', async () => {
      mockRepo.findById!.mockResolvedValue(null);
      await expect(service.delete('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
