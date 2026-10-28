import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Repository } from 'typeorm';
import { SubjectRepository } from './subject.repository.js';
import { Subject } from '../entities/subject.entity.js';

describe('SubjectRepository', () => {
  let repository: SubjectRepository;
  let mockTypeormRepo: Partial<
    Record<keyof Repository<Subject>, ReturnType<typeof vi.fn>>
  >;

  const sampleSubject: Subject = {
    id: 'sub-1',
    subjectCode: 'CS101',
    name: 'Computer Science 1',
    description: null,
  };

  beforeEach(() => {
    mockTypeormRepo = {
      create: vi.fn((data: any) => data),
      save: vi.fn(async (data: any) => ({ id: 'sub-1', ...data })),
      find: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    repository = new SubjectRepository(
      mockTypeormRepo as unknown as Repository<Subject>,
    );
  });

  describe('create', () => {
    it('creates and saves a subject entity', async () => {
      const data = { subjectCode: 'CS101', name: 'Computer Science 1' };
      const result = await repository.create(data);

      expect(mockTypeormRepo.create).toHaveBeenCalledWith(data);
      expect(mockTypeormRepo.save).toHaveBeenCalled();
      expect(result.id).toBe('sub-1');
    });
  });

  describe('findAll', () => {
    it('returns all subjects ordered by subjectCode ascending', async () => {
      mockTypeormRepo.find!.mockResolvedValue([sampleSubject]);
      const result = await repository.findAll();

      expect(mockTypeormRepo.find).toHaveBeenCalledWith({
        order: { subjectCode: 'ASC' },
      });
      expect(result).toEqual([sampleSubject]);
    });
  });

  describe('findById and findByCode', () => {
    it('finds subject by id', async () => {
      mockTypeormRepo.findOne!.mockResolvedValue(sampleSubject);
      const result = await repository.findById('sub-1');

      expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
      });
      expect(result).toEqual(sampleSubject);
    });

    it('finds subject by subjectCode', async () => {
      mockTypeormRepo.findOne!.mockResolvedValue(sampleSubject);
      const result = await repository.findByCode('CS101');

      expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { subjectCode: 'CS101' },
      });
      expect(result).toEqual(sampleSubject);
    });
  });

  describe('update and delete', () => {
    it('delegates update to typeorm repo', async () => {
      mockTypeormRepo.update!.mockResolvedValue(undefined);
      await repository.update('sub-1', { name: 'CS Updated' });

      expect(mockTypeormRepo.update).toHaveBeenCalledWith('sub-1', {
        name: 'CS Updated',
      });
    });

    it('delegates delete to typeorm repo', async () => {
      mockTypeormRepo.delete!.mockResolvedValue(undefined);
      await repository.delete('sub-1');

      expect(mockTypeormRepo.delete).toHaveBeenCalledWith('sub-1');
    });
  });
});
