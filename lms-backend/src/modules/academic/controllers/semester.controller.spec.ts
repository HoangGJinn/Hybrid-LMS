import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemesterController } from './semester.controller.js';
import { SemesterService } from '../services/semester.service.js';
import { Semester } from '../entities/semester.entity.js';

describe('SemesterController', () => {
  let controller: SemesterController;
  let mockService: Partial<Record<keyof SemesterService, ReturnType<typeof vi.fn>>>;

  const sampleSemester: Semester = {
    id: 'sem-uuid-1',
    semesterCode: 'HK1-2026',
    name: 'Học kỳ 1 - 2026',
    startDate: new Date('2026-09-01'),
    endDate: new Date('2026-12-31'),
  };

  beforeEach(() => {
    mockService = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    controller = new SemesterController(
      mockService as unknown as SemesterService,
    );
  });

  describe('test', () => {
    it('returns OK string', () => {
      expect(controller.test()).toBe('Semester module OK');
    });
  });

  describe('getAll', () => {
    it('returns list of SemesterViews', async () => {
      mockService.findAll!.mockResolvedValue([sampleSemester]);
      const result = await controller.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].semesterCode).toBe('HK1-2026');
    });
  });

  describe('getById', () => {
    it('returns single SemesterView', async () => {
      mockService.findById!.mockResolvedValue(sampleSemester);
      const result = await controller.getById('sem-uuid-1');
      expect(result.id).toBe('sem-uuid-1');
      expect(result.name).toBe('Học kỳ 1 - 2026');
    });
  });

  describe('create', () => {
    it('creates and returns SemesterView', async () => {
      mockService.create!.mockResolvedValue(sampleSemester);
      const dto = {
        semesterCode: 'HK1-2026',
        name: 'Học kỳ 1 - 2026',
        startDate: '2026-09-01',
        endDate: '2026-12-31',
      };
      const result = await controller.create(dto);
      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result.semesterCode).toBe('HK1-2026');
    });
  });

  describe('update', () => {
    it('updates and returns SemesterView', async () => {
      const updated = { ...sampleSemester, name: 'HK1 Updated' };
      mockService.update!.mockResolvedValue(updated);
      const dto = { name: 'HK1 Updated' };
      const result = await controller.update('sem-uuid-1', dto);
      expect(mockService.update).toHaveBeenCalledWith('sem-uuid-1', dto);
      expect(result.name).toBe('HK1 Updated');
    });
  });

  describe('delete', () => {
    it('deletes semester and returns success message', async () => {
      mockService.delete!.mockResolvedValue(undefined);
      const result = await controller.delete('sem-uuid-1');
      expect(mockService.delete).toHaveBeenCalledWith('sem-uuid-1');
      expect(result).toEqual({ message: 'Semester deleted successfully' });
    });
  });
});
