import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Repository } from 'typeorm';
import { SemesterRepository } from './semester.repository.js';
import { Semester } from '../entities/semester.entity.js';

describe('SemesterRepository', () => {
  let repository: SemesterRepository;
  let mockTypeormRepo: Partial<Record<keyof Repository<Semester>, ReturnType<typeof vi.fn>>>;

  const sampleSemester: Semester = {
    id: 'sem-1',
    semesterCode: 'HK1-2026',
    name: 'Học kỳ 1 - 2026',
    startDate: new Date('2026-09-01'),
    endDate: new Date('2026-12-31'),
  };

  beforeEach(() => {
    mockTypeormRepo = {
      create: vi.fn((data: any) => data),
      save: vi.fn(async (data: any) => ({ id: 'sem-1', ...data })),
      find: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    repository = new SemesterRepository(
      mockTypeormRepo as unknown as Repository<Semester>,
    );
  });

  describe('create', () => {
    it('creates and saves a semester entity', async () => {
      const data = {
        semesterCode: 'HK1-2026',
        name: 'Học kỳ 1 - 2026',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-31'),
      };
      const result = await repository.create(data);

      expect(mockTypeormRepo.create).toHaveBeenCalledWith(data);
      expect(mockTypeormRepo.save).toHaveBeenCalled();
      expect(result.id).toBe('sem-1');
    });
  });

  describe('findAll', () => {
    it('returns all semesters ordered by startDate descending', async () => {
      mockTypeormRepo.find!.mockResolvedValue([sampleSemester]);
      const result = await repository.findAll();

      expect(mockTypeormRepo.find).toHaveBeenCalledWith({
        order: { startDate: 'DESC' },
      });
      expect(result).toEqual([sampleSemester]);
    });
  });

  describe('findById and findByCode', () => {
    it('finds semester by id', async () => {
      mockTypeormRepo.findOne!.mockResolvedValue(sampleSemester);
      const result = await repository.findById('sem-1');

      expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'sem-1' },
      });
      expect(result).toEqual(sampleSemester);
    });

    it('finds semester by code', async () => {
      mockTypeormRepo.findOne!.mockResolvedValue(sampleSemester);
      const result = await repository.findByCode('HK1-2026');

      expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { semesterCode: 'HK1-2026' },
      });
      expect(result).toEqual(sampleSemester);
    });
  });

  describe('findActive', () => {
    it('queries active semester within current date range', async () => {
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(sampleSemester),
      };
      mockTypeormRepo.createQueryBuilder!.mockReturnValue(mockQueryBuilder as any);

      const now = new Date('2026-10-01');
      const result = await repository.findActive(now);

      expect(mockTypeormRepo.createQueryBuilder).toHaveBeenCalledWith('s');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        's.startDate <= :now AND s.endDate >= :now',
        { now },
      );
      expect(result).toEqual(sampleSemester);
    });
  });

  describe('update and delete', () => {
    it('delegates update to typeorm repo', async () => {
      mockTypeormRepo.update!.mockResolvedValue(undefined);
      await repository.update('sem-1', { name: 'HK1 Renamed' });

      expect(mockTypeormRepo.update).toHaveBeenCalledWith('sem-1', {
        name: 'HK1 Renamed',
      });
    });

    it('delegates delete to typeorm repo', async () => {
      mockTypeormRepo.delete!.mockResolvedValue(undefined);
      await repository.delete('sem-1');

      expect(mockTypeormRepo.delete).toHaveBeenCalledWith('sem-1');
    });
  });
});
