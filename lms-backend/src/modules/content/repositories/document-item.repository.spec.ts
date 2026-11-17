import { beforeEach, describe, expect, it, vi } from 'vitest';
import { In } from 'typeorm';
import type { Repository } from 'typeorm';
import type { ItemCompletion } from '../entities/item-completion.entity.js';
import { SectionItem } from '../entities/section-item.entity.js';
import { ItemType } from '../enums/item-type.enum.js';
import { DocumentItemRepository } from './document-item.repository.js';
import { restrictToLiveItems } from './item-filters.js';
import type { ItemScope } from './item-filters.js';

vi.mock('./item-filters.js', () => ({
  restrictToLiveItems: vi.fn((query: unknown) => query),
}));

type Mock = ReturnType<typeof vi.fn>;
type Builder = Record<string, Mock>;

function createBuilder(chain: string[], terminals: string[]): Builder {
  const builder: Builder = {};
  for (const name of chain) builder[name] = vi.fn().mockReturnValue(builder);
  for (const name of terminals) builder[name] = vi.fn();
  return builder;
}

const scope = { role: 'student' } as unknown as ItemScope;

describe('DocumentItemRepository', () => {
  let repository: DocumentItemRepository;
  let itemOrm: { createQueryBuilder: Mock; exists: Mock };
  let completionOrm: { createQueryBuilder: Mock; find: Mock; insert: Mock };

  beforeEach(() => {
    vi.mocked(restrictToLiveItems).mockClear();
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

  describe('findDocumentIdsByClassId', () => {
    let qb: Builder;

    beforeEach(() => {
      qb = createBuilder(
        ['innerJoin', 'select', 'where', 'andWhere', 'orderBy', 'addOrderBy'],
        ['getRawMany'],
      );
      itemOrm.createQueryBuilder.mockReturnValue(qb);
    });

    it('lists distinct document ids in display order, restricted to live items', async () => {
      qb.getRawMany.mockResolvedValue([
        { documentId: 'd-1' },
        { documentId: 'd-1' },
        { documentId: 'd-2' },
      ]);

      expect(await repository.findDocumentIdsByClassId('c-1', scope)).toEqual(['d-1', 'd-2']);

      expect(qb.where).toHaveBeenCalledWith('section.classId = :classId', { classId: 'c-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('item.itemType = :itemType', {
        itemType: ItemType.DOCUMENT,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('item.documentId IS NOT NULL');
      expect(qb.orderBy).toHaveBeenCalledWith('section.orderIndex', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('item.orderIndex', 'ASC');
      expect(restrictToLiveItems).toHaveBeenCalledWith(qb, scope);
    });

    it('uses an empty scope by default', async () => {
      qb.getRawMany.mockResolvedValue([]);

      expect(await repository.findDocumentIdsByClassId('c-1')).toEqual([]);
      expect(restrictToLiveItems).toHaveBeenCalledWith(qb, {});
    });
  });

  describe('findItemIdsByDocument', () => {
    it('lists the items of the class that show the document, restricted to live items', async () => {
      const qb = createBuilder(['innerJoin', 'select', 'where', 'andWhere'], ['getRawMany']);
      qb.getRawMany.mockResolvedValue([{ id: 'item-1' }]);
      itemOrm.createQueryBuilder.mockReturnValue(qb);

      expect(await repository.findItemIdsByDocument('c-1', 'd-1', scope)).toEqual(['item-1']);

      expect(qb.andWhere).toHaveBeenCalledWith('item.documentId = :documentId', {
        documentId: 'd-1',
      });
      expect(restrictToLiveItems).toHaveBeenCalledWith(qb, scope);
    });

    it('uses an empty scope by default', async () => {
      const qb = createBuilder(['innerJoin', 'select', 'where', 'andWhere'], ['getRawMany']);
      qb.getRawMany.mockResolvedValue([]);
      itemOrm.createQueryBuilder.mockReturnValue(qb);

      expect(await repository.findItemIdsByDocument('c-1', 'd-1')).toEqual([]);
      expect(restrictToLiveItems).toHaveBeenCalledWith(qb, {});
    });
  });

  describe('findCompletedDocumentIds', () => {
    it('lists the class documents the student has opened', async () => {
      const qb = createBuilder(['innerJoin', 'select', 'where', 'andWhere'], ['getRawMany']);
      qb.getRawMany.mockResolvedValue([{ documentId: 'd-1' }]);
      completionOrm.createQueryBuilder.mockReturnValue(qb);

      expect(await repository.findCompletedDocumentIds('c-1', 's-1')).toEqual(['d-1']);

      expect(qb.where).toHaveBeenCalledWith('completion.studentId = :studentId', {
        studentId: 's-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('section.classId = :classId', { classId: 'c-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('item.documentId IS NOT NULL');
    });
  });

  describe('markItemsCompleted', () => {
    it('inserts only the items the student has not completed yet', async () => {
      completionOrm.find.mockResolvedValue([{ sectionItemId: 'item-1' }]);

      await repository.markItemsCompleted('s-1', ['item-1', 'item-2']);

      expect(completionOrm.find).toHaveBeenCalledWith({
        select: { sectionItemId: true },
        where: { studentId: 's-1', sectionItemId: In(['item-1', 'item-2']) },
      });
      expect(completionOrm.insert).toHaveBeenCalledWith([
        { sectionItemId: 'item-2', studentId: 's-1', completedAt: expect.any(Date) },
      ]);
    });

    it('does not insert when every item is already completed', async () => {
      completionOrm.find.mockResolvedValue([{ sectionItemId: 'item-1' }]);

      await repository.markItemsCompleted('s-1', ['item-1']);

      expect(completionOrm.insert).not.toHaveBeenCalled();
    });

    it('does not insert when no items are given', async () => {
      completionOrm.find.mockResolvedValue([]);

      await repository.markItemsCompleted('s-1', []);

      expect(completionOrm.insert).not.toHaveBeenCalled();
    });
  });

  describe('deleteItemsByDocument (soft delete)', () => {
    let qb: Builder;

    beforeEach(() => {
      qb = createBuilder(['update', 'set', 'where', 'andWhere'], ['execute']);
      itemOrm.createQueryBuilder.mockReturnValue(qb);
    });

    it('soft-deletes the live items of the class and returns how many', async () => {
      qb.execute.mockResolvedValue({ affected: 2 });

      expect(await repository.deleteItemsByDocument('c-1', 'd-1', 'user-1')).toBe(2);

      expect(qb.update).toHaveBeenCalledWith(SectionItem);
      expect(qb.set).toHaveBeenCalledWith({
        deletedAt: expect.any(Function),
        deletedBy: 'user-1',
      });
      const patch = qb.set.mock.calls[0][0] as { deletedAt: () => string };
      expect(patch.deletedAt()).toBe('NOW()');
      expect(qb.where).toHaveBeenCalledWith('document_id = :documentId', { documentId: 'd-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'section_id IN (SELECT id FROM sections WHERE class_id = :classId)',
        { classId: 'c-1' },
      );
    });

    it('records null as the deleter when none is given', async () => {
      qb.execute.mockResolvedValue({ affected: 1 });

      await repository.deleteItemsByDocument('c-1', 'd-1');

      expect(qb.set).toHaveBeenCalledWith(expect.objectContaining({ deletedBy: null }));
    });

    it('returns 0 when the driver reports no affected count', async () => {
      qb.execute.mockResolvedValue({});

      expect(await repository.deleteItemsByDocument('c-1', 'd-1')).toBe(0);
    });
  });

  describe('isDocumentReferenced', () => {
    it('checks any section item, deleted or not', async () => {
      itemOrm.exists.mockResolvedValue(true);

      expect(await repository.isDocumentReferenced('d-1')).toBe(true);
      expect(itemOrm.exists).toHaveBeenCalledWith({ where: { documentId: 'd-1' } });
    });
  });
});
