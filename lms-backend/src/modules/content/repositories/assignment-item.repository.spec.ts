import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import type { SectionItem } from '../entities/section-item.entity.js';
import { AssignmentItemRepository } from './assignment-item.repository.js';

type Mock = ReturnType<typeof vi.fn>;

describe('AssignmentItemRepository', () => {
  let repository: AssignmentItemRepository;
  let itemOrm: { createQueryBuilder: Mock; exists: Mock };

  beforeEach(() => {
    itemOrm = {
      createQueryBuilder: vi.fn(),
      exists: vi.fn(),
    };
    repository = new AssignmentItemRepository(
      itemOrm as unknown as Repository<SectionItem>,
    );
  });

  it('checks existence, lists assignment-class links, deletes items, and checks references', async () => {
    const existsQb = {
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getExists: vi.fn().mockResolvedValue(true),
    };
    itemOrm.createQueryBuilder.mockReturnValueOnce(existsQb);
    expect(await repository.existsInClass('c-1', 'a-1')).toBe(true);

    expect(await repository.findByClasses([])).toEqual([]);

    const listQb = {
      innerJoin: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      distinct: vi.fn().mockReturnThis(),
      getRawMany: vi
        .fn()
        .mockResolvedValue([{ assignmentId: 'a-1', classId: 'c-1' }]),
    };
    itemOrm.createQueryBuilder.mockReturnValueOnce(listQb);
    expect(await repository.findByClasses(['c-1'])).toEqual([
      { assignmentId: 'a-1', classId: 'c-1' },
    ]);

    const deleteQb = {
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({ affected: 3 }),
    };
    itemOrm.createQueryBuilder.mockReturnValueOnce(deleteQb);
    expect(await repository.deleteItemsByAssignment('c-1', 'a-1')).toBe(3);

    itemOrm.exists.mockResolvedValue(true);
    expect(await repository.isAssignmentReferenced('a-1')).toBe(true);
  });
});

