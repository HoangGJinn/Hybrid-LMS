import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { Section } from '../entities/section.entity.js';
import { SectionItem } from '../entities/section-item.entity.js';
import { ItemType } from '../enums/item-type.enum.js';
import { AssignmentItemRepository } from './assignment-item.repository.js';
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

describe('AssignmentItemRepository', () => {
  let repository: AssignmentItemRepository;
  let itemOrm: {
    createQueryBuilder: Mock;
    exists: Mock;
    manager: { transaction: Mock };
  };
  let txManager: { findOne: Mock; getRepository: Mock; insert: Mock };
  let maxQuery: Builder;

  beforeEach(() => {
    vi.mocked(restrictToLiveItems).mockClear();
    maxQuery = createBuilder(['select', 'where'], ['getRawOne']);
    txManager = {
      findOne: vi.fn(),
      getRepository: vi.fn().mockReturnValue({
        createQueryBuilder: vi.fn().mockReturnValue(maxQuery),
      }),
      insert: vi.fn().mockResolvedValue(undefined),
    };
    itemOrm = {
      createQueryBuilder: vi.fn(),
      exists: vi.fn(),
      manager: {
        transaction: vi.fn((callback: (manager: unknown) => Promise<unknown>) =>
          callback(txManager),
        ),
      },
    };
    repository = new AssignmentItemRepository(
      itemOrm as unknown as Repository<SectionItem>,
    );
  });

  describe('existsInClass', () => {
    it('checks the assignment is shown by a section of the class, restricted to live items', async () => {
      const qb = createBuilder(['innerJoin', 'where', 'andWhere'], ['getExists']);
      qb.getExists.mockResolvedValue(true);
      itemOrm.createQueryBuilder.mockReturnValue(qb);

      expect(await repository.existsInClass('c-1', 'a-1', scope)).toBe(true);

      expect(qb.where).toHaveBeenCalledWith('section.classId = :classId', { classId: 'c-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('item.itemType = :itemType', {
        itemType: ItemType.ASSIGNMENT,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('item.assignmentId = :assignmentId', {
        assignmentId: 'a-1',
      });
      expect(restrictToLiveItems).toHaveBeenCalledWith(qb, scope);
    });

    it('uses an empty scope by default', async () => {
      const qb = createBuilder(['innerJoin', 'where', 'andWhere'], ['getExists']);
      qb.getExists.mockResolvedValue(false);
      itemOrm.createQueryBuilder.mockReturnValue(qb);

      expect(await repository.existsInClass('c-1', 'a-1')).toBe(false);
      expect(restrictToLiveItems).toHaveBeenCalledWith(qb, {});
    });
  });

  describe('findByClasses', () => {
    it('returns an empty list without querying when no classes are given', async () => {
      expect(await repository.findByClasses([])).toEqual([]);
      expect(itemOrm.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('lists each (assignment, class) pair, restricted to live items', async () => {
      const qb = createBuilder(
        ['innerJoin', 'select', 'addSelect', 'where', 'andWhere', 'distinct'],
        ['getRawMany'],
      );
      qb.getRawMany.mockResolvedValue([{ assignmentId: 'a-1', classId: 'c-1' }]);
      itemOrm.createQueryBuilder.mockReturnValue(qb);

      expect(await repository.findByClasses(['c-1'], scope)).toEqual([
        { assignmentId: 'a-1', classId: 'c-1' },
      ]);

      expect(qb.where).toHaveBeenCalledWith('section.classId IN (:...classIds)', {
        classIds: ['c-1'],
      });
      expect(qb.andWhere).toHaveBeenCalledWith('item.assignmentId IS NOT NULL');
      expect(qb.distinct).toHaveBeenCalledWith(true);
      expect(restrictToLiveItems).toHaveBeenCalledWith(qb, scope);
    });
  });

  describe('appendToSection', () => {
    it('inserts the assignment after the last item of the section', async () => {
      txManager.findOne.mockResolvedValue({ id: 'sec-1' });
      maxQuery.getRawOne.mockResolvedValue({ maxOrder: '4' });

      expect(await repository.appendToSection('c-1', 'sec-1', 'a-1', 'Homework')).toBe(true);

      expect(txManager.findOne).toHaveBeenCalledWith(Section, {
        where: { id: 'sec-1', classId: 'c-1' },
      });
      expect(txManager.getRepository).toHaveBeenCalledWith(SectionItem);
      expect(txManager.insert).toHaveBeenCalledWith(SectionItem, {
        sectionId: 'sec-1',
        itemType: ItemType.ASSIGNMENT,
        title: 'Homework',
        externalUrl: null,
        orderIndex: 5,
        documentId: null,
        assignmentId: 'a-1',
        examId: null,
      });
    });

    it('starts at 1 when the section is empty', async () => {
      txManager.findOne.mockResolvedValue({ id: 'sec-1' });
      maxQuery.getRawOne.mockResolvedValue(undefined);

      await repository.appendToSection('c-1', 'sec-1', 'a-1', 'Homework');

      expect(txManager.insert).toHaveBeenCalledWith(
        SectionItem,
        expect.objectContaining({ orderIndex: 1 }),
      );
    });

    it('returns false and inserts nothing when the section is not of the class', async () => {
      txManager.findOne.mockResolvedValue(null);

      expect(await repository.appendToSection('c-1', 'other', 'a-1', 'Homework')).toBe(false);
      expect(txManager.insert).not.toHaveBeenCalled();
    });
  });

  describe('deleteItemsByAssignment (soft delete)', () => {
    let qb: Builder;

    beforeEach(() => {
      qb = createBuilder(['update', 'set', 'where', 'andWhere'], ['execute']);
      itemOrm.createQueryBuilder.mockReturnValue(qb);
    });

    it('soft-deletes the live items of the class and returns how many', async () => {
      qb.execute.mockResolvedValue({ affected: 3 });

      expect(await repository.deleteItemsByAssignment('c-1', 'a-1', 'user-1')).toBe(3);

      expect(qb.update).toHaveBeenCalledWith(SectionItem);
      expect(qb.set).toHaveBeenCalledWith({
        deletedAt: expect.any(Function),
        deletedBy: 'user-1',
      });
      const patch = qb.set.mock.calls[0][0] as { deletedAt: () => string };
      expect(patch.deletedAt()).toBe('NOW()');
      expect(qb.where).toHaveBeenCalledWith('assignment_id = :assignmentId', {
        assignmentId: 'a-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'section_id IN (SELECT id FROM sections WHERE class_id = :classId)',
        { classId: 'c-1' },
      );
    });

    it('records null as the deleter when none is given', async () => {
      qb.execute.mockResolvedValue({ affected: 1 });

      await repository.deleteItemsByAssignment('c-1', 'a-1');

      expect(qb.set).toHaveBeenCalledWith(expect.objectContaining({ deletedBy: null }));
    });

    it('returns 0 when the driver reports no affected count', async () => {
      qb.execute.mockResolvedValue({});

      expect(await repository.deleteItemsByAssignment('c-1', 'a-1')).toBe(0);
    });
  });

  describe('isAssignmentReferenced', () => {
    it('checks any section item, deleted or not', async () => {
      itemOrm.exists.mockResolvedValue(true);

      expect(await repository.isAssignmentReferenced('a-1')).toBe(true);
      expect(itemOrm.exists).toHaveBeenCalledWith({ where: { assignmentId: 'a-1' } });
    });
  });

  describe('findReferencedIds', () => {
    it('returns an empty set without querying when no ids are given', async () => {
      expect(await repository.findReferencedIds([])).toEqual(new Set());
      expect(itemOrm.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('returns the ids some section item still points at', async () => {
      const qb = createBuilder(['select', 'where', 'distinct'], ['getRawMany']);
      qb.getRawMany.mockResolvedValue([{ assignmentId: 'a-1' }, { assignmentId: 'a-3' }]);
      itemOrm.createQueryBuilder.mockReturnValue(qb);

      expect(await repository.findReferencedIds(['a-1', 'a-2', 'a-3'])).toEqual(
        new Set(['a-1', 'a-3']),
      );
      expect(qb.where).toHaveBeenCalledWith('item.assignmentId IN (:...assignmentIds)', {
        assignmentIds: ['a-1', 'a-2', 'a-3'],
      });
    });
  });

  describe('purgeDeletedBefore', () => {
    const cutoff = new Date('2026-01-01T00:00:00Z');
    let qb: Builder;

    beforeEach(() => {
      qb = createBuilder(['delete', 'from', 'where', 'andWhere', 'returning'], ['execute']);
      itemOrm.createQueryBuilder.mockReturnValue(qb);
    });

    it('permanently deletes old soft-deleted assignment items and returns their assignment ids once each', async () => {
      qb.execute.mockResolvedValue({
        raw: [
          { assignment_id: 'a-1' },
          { assignment_id: 'a-1' },
          { assignment_id: null },
          { assignment_id: 'a-2' },
        ],
      });

      expect(await repository.purgeDeletedBefore(cutoff)).toEqual(['a-1', 'a-2']);

      expect(qb.from).toHaveBeenCalledWith(SectionItem);
      expect(qb.where).toHaveBeenCalledWith('item_type = :itemType', {
        itemType: ItemType.ASSIGNMENT,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('deleted_at IS NOT NULL');
      expect(qb.andWhere).toHaveBeenCalledWith('deleted_at < :cutoff', { cutoff });
      expect(qb.returning).toHaveBeenCalledWith('assignment_id');
    });

    it('returns an empty list when nothing was purged', async () => {
      qb.execute.mockResolvedValue({ raw: [] });

      expect(await repository.purgeDeletedBefore(cutoff)).toEqual([]);
    });
  });
});
