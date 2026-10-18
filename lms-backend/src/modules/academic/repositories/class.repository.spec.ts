import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Repository } from 'typeorm';
import { ClassRepository } from './class.repository.js';
import { Class } from '../entities/class.entity.js';
import { ClassStudent } from '../entities/class-student.entity.js';

describe('ClassRepository', () => {
  let repository: ClassRepository;
  let mockClassTypeormRepo: Partial<Record<keyof Repository<Class>, ReturnType<typeof vi.fn>>>;
  let mockClassStudentTypeormRepo: Partial<Record<keyof Repository<ClassStudent>, ReturnType<typeof vi.fn>>>;

  const sampleClass: Class = {
    id: 'cls-1',
    classCode: 'CS101.Q1',
    name: 'CS Class 1',
    subjectId: 'sub-1',
    semesterId: 'sem-1',
    lecturerId: 'lec-1',
    isActive: true,
    endedAt: null,
  };

  beforeEach(() => {
    mockClassTypeormRepo = {
      create: vi.fn((data: any) => data),
      save: vi.fn(async (data: any) => ({ id: 'cls-1', ...data })),
      findOne: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    mockClassStudentTypeormRepo = {
      find: vi.fn(),
      count: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    repository = new ClassRepository(
      mockClassTypeormRepo as unknown as Repository<Class>,
      mockClassStudentTypeormRepo as unknown as Repository<ClassStudent>,
    );
  });

  describe('create', () => {
    it('creates and saves class entity', async () => {
      const data = { classCode: 'CS101.Q1', name: 'CS Class 1' };
      const result = await repository.create(data);

      expect(mockClassTypeormRepo.create).toHaveBeenCalledWith(data);
      expect(mockClassTypeormRepo.save).toHaveBeenCalled();
      expect(result.id).toBe('cls-1');
    });
  });

  describe('findAll', () => {
    it('applies filters and returns classes', async () => {
      const mockQb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([sampleClass]),
      };
      mockClassTypeormRepo.createQueryBuilder!.mockReturnValue(mockQb as any);

      const result = await repository.findAll({
        isActive: true,
        semesterId: 'sem-1',
        subjectId: 'sub-1',
        search: 'CS',
      });

      expect(mockClassTypeormRepo.createQueryBuilder).toHaveBeenCalledWith('c');
      expect(mockQb.andWhere).toHaveBeenCalledWith('c.isActive = :isActive', { isActive: true });
      expect(mockQb.andWhere).toHaveBeenCalledWith('c.semesterId = :semesterId', { semesterId: 'sem-1' });
      expect(mockQb.andWhere).toHaveBeenCalledWith('c.subjectId = :subjectId', { subjectId: 'sub-1' });
      expect(mockQb.andWhere).toHaveBeenCalledWith('(c.name ILIKE :search OR c.classCode ILIKE :search)', { search: '%CS%' });
      expect(result).toEqual([sampleClass]);
    });
  });

  describe('findById and findByCode', () => {
    it('finds class by id with relations', async () => {
      mockClassTypeormRepo.findOne!.mockResolvedValue(sampleClass);
      const result = await repository.findById('cls-1');

      expect(mockClassTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cls-1' },
        relations: {
          subject: true,
          semester: true,
          lecturer: { user: true },
        },
      });
      expect(result).toEqual(sampleClass);
    });

    it('finds class by code', async () => {
      mockClassTypeormRepo.findOne!.mockResolvedValue(sampleClass);
      const result = await repository.findByCode('CS101.Q1');

      expect(mockClassTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { classCode: 'CS101.Q1' },
      });
      expect(result).toEqual(sampleClass);
    });
  });

  describe('findByLecturerId', () => {
    it('finds active classes for lecturer', async () => {
      mockClassTypeormRepo.find!.mockResolvedValue([sampleClass]);
      const result = await repository.findByLecturerId('lec-1');

      expect(mockClassTypeormRepo.find).toHaveBeenCalledWith({
        where: { lecturerId: 'lec-1', isActive: true },
        relations: {
          subject: true,
          semester: true,
          lecturer: { user: true },
        },
        order: { classCode: 'ASC' },
      });
      expect(result).toEqual([sampleClass]);
    });
  });

  describe('findByStudentId', () => {
    it('finds active classes student is enrolled in', async () => {
      mockClassStudentTypeormRepo.find!.mockResolvedValue([
        { classId: 'cls-1', studentId: 'stu-1', class: sampleClass },
        { classId: 'cls-2', studentId: 'stu-1', class: { ...sampleClass, id: 'cls-2', isActive: false } },
      ]);

      const result = await repository.findByStudentId('stu-1');

      expect(mockClassStudentTypeormRepo.find).toHaveBeenCalledWith({
        where: { studentId: 'stu-1' },
        relations: {
          class: {
            subject: true,
            semester: true,
            lecturer: { user: true },
          },
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cls-1');
    });
  });

  describe('countStudents and countStudentsBatch', () => {
    it('counts students for single class', async () => {
      mockClassStudentTypeormRepo.count!.mockResolvedValue(25);
      const result = await repository.countStudents('cls-1');

      expect(mockClassStudentTypeormRepo.count).toHaveBeenCalledWith({
        where: { classId: 'cls-1' },
      });
      expect(result).toBe(25);
    });

    it('returns empty map if classIds is empty', async () => {
      const result = await repository.countStudentsBatch([]);
      expect(result.size).toBe(0);
    });

    it('returns map of student counts for batch class IDs', async () => {
      const mockQb = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([
          { classId: 'cls-1', count: '10' },
          { classId: 'cls-2', count: '0' },
        ]),
      };
      mockClassStudentTypeormRepo.createQueryBuilder!.mockReturnValue(mockQb as any);

      const result = await repository.countStudentsBatch(['cls-1', 'cls-2', 'cls-3']);

      expect(result.get('cls-1')).toBe(10);
      expect(result.get('cls-2')).toBe(0);
      expect(result.get('cls-3')).toBe(0);
    });
  });

  describe('update and delete', () => {
    it('delegates update to typeorm repo', async () => {
      mockClassTypeormRepo.update!.mockResolvedValue(undefined);
      await repository.update('cls-1', { name: 'New Name' });

      expect(mockClassTypeormRepo.update).toHaveBeenCalledWith('cls-1', {
        name: 'New Name',
      });
    });

    it('delegates delete to typeorm repo', async () => {
      mockClassTypeormRepo.delete!.mockResolvedValue(undefined);
      await repository.delete('cls-1');

      expect(mockClassTypeormRepo.delete).toHaveBeenCalledWith('cls-1');
    });
  });
});
