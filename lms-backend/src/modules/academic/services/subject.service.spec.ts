import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubjectService } from './subject.service.js';
import { SubjectRepository } from '../repositories/subject.repository.js';
import { Subject } from '../entities/subject.entity.js';

describe('SubjectService', () => {
  let service: SubjectService;
  let mockRepo: Partial<
    Record<keyof SubjectRepository, ReturnType<typeof vi.fn>>
  >;

  const sampleSubject: Subject = {
    id: 'sub-uuid-1',
    subjectCode: 'CS101',
    name: 'Intro to CS',
    description: 'Basic computer science',
  };

  beforeEach(() => {
    mockRepo = {
      findByCode: vi.fn(),
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new SubjectService(mockRepo as unknown as SubjectRepository);
  });

  describe('create', () => {
    it('creates a new subject successfully', async () => {
      mockRepo.findByCode!.mockResolvedValue(null);
      mockRepo.create!.mockResolvedValue(sampleSubject);

      const result = await service.create({
        subjectCode: 'CS101',
        name: 'Intro to CS',
        description: 'Basic computer science',
      });

      expect(mockRepo.findByCode).toHaveBeenCalledWith('CS101');
      expect(mockRepo.create).toHaveBeenCalledWith({
        subjectCode: 'CS101',
        name: 'Intro to CS',
        description: 'Basic computer science',
      });
      expect(result).toEqual(sampleSubject);
    });

    it('throws ConflictException if subjectCode already exists', async () => {
      mockRepo.findByCode!.mockResolvedValue(sampleSubject);

      await expect(
        service.create({
          subjectCode: 'CS101',
          name: 'Another CS',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns an array of subjects', async () => {
      mockRepo.findAll!.mockResolvedValue([sampleSubject]);
      const result = await service.findAll();
      expect(result).toEqual([sampleSubject]);
    });
  });

  describe('findById', () => {
    it('returns subject if found', async () => {
      mockRepo.findById!.mockResolvedValue(sampleSubject);
      const result = await service.findById('sub-uuid-1');
      expect(result).toEqual(sampleSubject);
    });

    it('throws NotFoundException if subject does not exist', async () => {
      mockRepo.findById!.mockResolvedValue(null);
      await expect(service.findById('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates subject successfully', async () => {
      mockRepo.findById!.mockResolvedValue(sampleSubject);
      mockRepo.findByCode!.mockResolvedValue(null);
      mockRepo.update!.mockResolvedValue(undefined);

      const updated = { ...sampleSubject, name: 'Advanced CS' };
      // Second findById call returns updated
      mockRepo
        .findById!.mockResolvedValueOnce(sampleSubject)
        .mockResolvedValueOnce(updated);

      const result = await service.update('sub-uuid-1', {
        name: 'Advanced CS',
      });

      expect(result).toEqual(updated);
    });

    it('throws ConflictException if updating to existing subjectCode', async () => {
      mockRepo.findById!.mockResolvedValue(sampleSubject);
      mockRepo.findByCode!.mockResolvedValue({
        id: 'other-uuid',
        subjectCode: 'CS102',
      });

      await expect(
        service.update('sub-uuid-1', { subjectCode: 'CS102' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('deletes subject if found', async () => {
      mockRepo.findById!.mockResolvedValue(sampleSubject);
      mockRepo.delete!.mockResolvedValue(undefined);

      await expect(service.delete('sub-uuid-1')).resolves.toBeUndefined();
      expect(mockRepo.delete).toHaveBeenCalledWith('sub-uuid-1');
    });

    it('throws NotFoundException if subject does not exist', async () => {
      mockRepo.findById!.mockResolvedValue(null);
      await expect(service.delete('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
