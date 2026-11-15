import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import type { ExamSchedule } from '../../exam/entities/exam-schedule.entity.js';
import type { SectionItem } from '../entities/section-item.entity.js';
import { ExamItemRepository } from './exam-item.repository.js';

type Mock = ReturnType<typeof vi.fn>;

describe('ExamItemRepository', () => {
  let repository: ExamItemRepository;
  let itemOrm: { createQueryBuilder: Mock; exists: Mock };
  let examOrm: { find: Mock };

  beforeEach(() => {
    itemOrm = {
      createQueryBuilder: vi.fn(),
      exists: vi.fn(),
    };
    examOrm = {
      find: vi.fn(),
    };

    repository = new ExamItemRepository(
      itemOrm as unknown as Repository<SectionItem>,
      examOrm as unknown as Repository<ExamSchedule>,
    );
  });

  it('checks existence in class and lists class-exam links', async () => {
    const existsQb = {
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getExists: vi.fn().mockResolvedValue(true),
    };
    itemOrm.createQueryBuilder.mockReturnValueOnce(existsQb);
    expect(await repository.existsInClass('c-1', 'e-1')).toBe(true);

    expect(await repository.findByClasses([])).toEqual([]);

    const listQb = {
      innerJoin: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      distinct: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([{ examId: 'e-1', classId: 'c-1' }]),
    };
    itemOrm.createQueryBuilder.mockReturnValueOnce(listQb);
    expect(await repository.findByClasses(['c-1'])).toEqual([
      { examId: 'e-1', classId: 'c-1' },
    ]);
  });

  it('deletes items, checks references, and filters exam ids belonging to a class', async () => {
    const deleteQb = {
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    itemOrm.createQueryBuilder.mockReturnValueOnce(deleteQb);
    expect(await repository.deleteItemsByExam('c-1', 'e-1')).toBe(1);

    itemOrm.exists.mockResolvedValue(false);
    expect(await repository.isExamReferenced('e-1')).toBe(false);

    expect(await repository.findExamIdsOfClass('c-1', [])).toEqual([]);
    examOrm.find.mockResolvedValue([{ id: 'e-1' }]);
    expect(await repository.findExamIdsOfClass('c-1', ['e-1', 'e-2'])).toEqual([
      'e-1',
    ]);
  });
});

