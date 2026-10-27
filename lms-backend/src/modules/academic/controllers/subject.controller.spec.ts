import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubjectController } from './subject.controller.js';
import { SubjectService } from '../services/subject.service.js';
import { Subject } from '../entities/subject.entity.js';

describe('SubjectController', () => {
  let controller: SubjectController;
  let mockService: Partial<
    Record<keyof SubjectService, ReturnType<typeof vi.fn>>
  >;

  const sampleSubject: Subject = {
    id: 'sub-uuid-1',
    subjectCode: 'CS101',
    name: 'Intro to CS',
    description: 'Basic computer science',
  };

  beforeEach(() => {
    mockService = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    controller = new SubjectController(
      mockService as unknown as SubjectService,
    );
  });

  describe('getAll', () => {
    it('returns list of SubjectViews', async () => {
      mockService.findAll!.mockResolvedValue([sampleSubject]);
      const result = await controller.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].subjectCode).toBe('CS101');
    });
  });

  describe('getById', () => {
    it('returns single SubjectView', async () => {
      mockService.findById!.mockResolvedValue(sampleSubject);
      const result = await controller.getById('sub-uuid-1');
      expect(result.id).toBe('sub-uuid-1');
      expect(result.name).toBe('Intro to CS');
    });
  });

  describe('create', () => {
    it('creates and returns SubjectView', async () => {
      mockService.create!.mockResolvedValue(sampleSubject);
      const dto = {
        subjectCode: 'CS101',
        name: 'Intro to CS',
        description: 'Basic computer science',
      };
      const result = await controller.create(dto);
      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result.subjectCode).toBe('CS101');
    });
  });

  describe('update', () => {
    it('updates and returns SubjectView', async () => {
      const updated = { ...sampleSubject, name: 'Updated CS' };
      mockService.update!.mockResolvedValue(updated);
      const dto = { name: 'Updated CS' };
      const result = await controller.update('sub-uuid-1', dto);
      expect(mockService.update).toHaveBeenCalledWith('sub-uuid-1', dto);
      expect(result.name).toBe('Updated CS');
    });
  });

  describe('delete', () => {
    it('deletes subject and returns success message', async () => {
      mockService.delete!.mockResolvedValue(undefined);
      const result = await controller.delete('sub-uuid-1');
      expect(mockService.delete).toHaveBeenCalledWith('sub-uuid-1');
      expect(result).toEqual({ message: 'Subject deleted successfully' });
    });
  });
});
