import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemesterController } from './semester.controller.js';
import { SemesterService } from '../services/semester.service.js';
import { SemesterImportService } from '../services/semester-import.service.js';
import { Semester } from '../entities/semester.entity.js';

describe('SemesterController', () => {
  let controller: SemesterController;
  let mockService: Partial<
    Record<keyof SemesterService, ReturnType<typeof vi.fn>>
  >;

  let mockImport: Record<'importSemesters', ReturnType<typeof vi.fn>>;

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
    mockImport = { importSemesters: vi.fn() };
    controller = new SemesterController(
      mockService as unknown as SemesterService,
      mockImport as unknown as SemesterImportService,
    );
  });

  describe('importSemesters', () => {
    it('hands the rows to the import service', async () => {
      const dto = { rows: [{ line: 2, semesterCode: 'HK1' }], dryRun: true };
      const summary = { dryRun: true, total: 1, created: 0, skipped: 0, failed: 1, rows: [] };
      mockImport.importSemesters.mockResolvedValue(summary);
      expect(await controller.importSemesters(dto)).toBe(summary);
      expect(mockImport.importSemesters).toHaveBeenCalledWith(dto);
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
