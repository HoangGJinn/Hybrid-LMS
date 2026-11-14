import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import type { ItemCompletion } from '../entities/item-completion.entity.js';
import type { SectionItem } from '../entities/section-item.entity.js';
import { DocumentItemRepository } from './document-item.repository.js';

type Mock = ReturnType<typeof vi.fn>;

describe('DocumentItemRepository', () => {
  let repository: DocumentItemRepository;
  let itemOrm: { createQueryBuilder: Mock; exists: Mock };
  let completionOrm: {
    createQueryBuilder: Mock;
    find: Mock;
    insert: Mock;
  };

  beforeEach(() => {
    itemOrm = {
      createQueryBuilder: vi.fn(),
      exists: vi.fn(),
    };
    completionOrm = {
      createQueryBuilder: vi.fn(),
      find: vi.fn(),
      insert: vi.fn().mockResolvedValue(undefined),
    };

    repository = new DocumentItemRepository(
      itemOrm as unknown as Repository<SectionItem>,
      completionOrm as unknown as Repository<ItemCompletion>,
    );
  });

  it('lists distinct document ids, item ids, and completed document ids in class', async () => {
    const qb = {
      innerJoin: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getRawMany: vi
        .fn()
        .mockResolvedValue([{ documentId: 'd-1' }, { documentId: 'd-1' }, { documentId: 'd-2' }]),
    };
    itemOrm.createQueryBuilder.mockReturnValueOnce(qb);
    expect(await repository.findDocumentIdsByClassId('c-1')).toEqual(['d-1', 'd-2']);

    const itemQb = {
      innerJoin: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([{ id: 'item-1' }]),
    };
    itemOrm.createQueryBuilder.mockReturnValueOnce(itemQb);
    expect(await repository.findItemIdsByDocument('c-1', 'd-1')).toEqual(['item-1']);

    const compQb = {
      innerJoin: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([{ documentId: 'd-1' }]),
    };
    completionOrm.createQueryBuilder.mockReturnValueOnce(compQb);
    expect(await repository.findCompletedDocumentIds('c-1', 's-1')).toEqual(['d-1']);
  });

  it('marks only uncompleted items as completed and skips insert when already completed', async () => {
    completionOrm.find.mockResolvedValueOnce([{ sectionItemId: 'item-1' }]);
    await repository.markItemsCompleted('s-1', ['item-1', 'item-2']);
    expect(completionOrm.insert).toHaveBeenCalledWith([
      {
        sectionItemId: 'item-2',
        studentId: 's-1',
        completedAt: expect.any(Date),
      },
    ]);

    completionOrm.insert.mockClear();
    completionOrm.find.mockResolvedValueOnce([{ sectionItemId: 'item-1' }]);
    await repository.markItemsCompleted('s-1', ['item-1']);
    expect(completionOrm.insert).not.toHaveBeenCalled();
  });

  it('deletes document items in class and checks reference existence', async () => {
    const deleteQb = {
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({ affected: 2 }),
    };
    itemOrm.createQueryBuilder.mockReturnValueOnce(deleteQb);
    expect(await repository.deleteItemsByDocument('c-1', 'd-1')).toBe(2);

    itemOrm.createQueryBuilder.mockReturnValueOnce({
      ...deleteQb,
      execute: vi.fn().mockResolvedValue({}),
    });
    expect(await repository.deleteItemsByDocument('c-1', 'd-1')).toBe(0);

    itemOrm.exists.mockResolvedValue(true);
    expect(await repository.isDocumentReferenced('d-1')).toBe(true);
  });
});

