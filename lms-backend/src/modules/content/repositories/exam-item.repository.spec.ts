import { beforeEach, describe, expect, it, vi } from 'vitest';
import { In } from 'typeorm';
import type { Repository } from 'typeorm';
import type { ExamSchedule } from '../../exam/entities/exam-schedule.entity.js';
import { SectionItem } from '../entities/section-item.entity.js';
import { ItemType } from '../enums/item-type.enum.js';
import { ExamItemRepository } from './exam-item.repository.js';
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

describe('ExamItemRepository', () => {
  let repository: ExamItemRepository;
  let itemOrm: { createQueryBuilder: Mock; exists: Mock };
  let examOrm: { find: Mock };

  beforeEach(() => {
    vi.mocked(restrictToLiveItems).mockClear();
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

  describe('existsInClass', () => {
    it('checks the exam is shown by a section of the class, restricted to live items', async () => {
      const qb = createBuilder(['innerJoin', 'where', 'andWhere'], ['getExists']);
      qb.getExists.mockResolvedValue(true);
      itemOrm.createQueryBuilder.mockReturnValue(qb);

      expect(await repository.existsInClass('c-1', 'e-1', scope)).toBe(true);

      expect(qb.where).toHaveBeenCalledWith('section.classId = :classId', { classId: 'c-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('item.itemType = :itemType', {
        itemType: ItemType.EXAM,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('item.examId = :examId', { examId: 'e-1' });
      expect(restrictToLiveItems).toHaveBeenCalledWith(qb, scope);
    });

    it('uses an empty scope by default', async () => {
      const qb = createBuilder(['innerJoin', 'where', 'andWhere'], ['getExists']);
      qb.getExists.mockResolvedValue(false);
      itemOrm.createQueryBuilder.mockReturnValue(qb);

      expect(await repository.existsInClass('c-1', 'e-1')).toBe(false);
      expect(restrictToLiveItems).toHaveBeenCalledWith(qb, {});
    });
  });

  describe('findByClasses', () => {
    it('returns an empty list without querying when no classes are given', async () => {
      expect(await repository.findByClasses([])).toEqual([]);
      expect(itemOrm.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('lists each (exam, class) pair, restricted to live items', async () => {
      const qb = createBuilder(
        ['innerJoin', 'select', 'addSelect', 'where', 'andWhere', 'distinct'],
        ['getRawMany'],
      );
      qb.getRawMany.mockResolvedValue([{ examId: 'e-1', classId: 'c-1' }]);
      itemOrm.createQueryBuilder.mockReturnValue(qb);

      expect(await repository.findByClasses(['c-1'], scope)).toEqual([
        { examId: 'e-1', classId: 'c-1' },
      ]);

      expect(qb.where).toHaveBeenCalledWith('section.classId IN (:...classIds)', {
        classIds: ['c-1'],
      });
      expect(qb.andWhere).toHaveBeenCalledWith('item.examId IS NOT NULL');
      expect(qb.distinct).toHaveBeenCalledWith(true);
      expect(restrictToLiveItems).toHaveBeenCalledWith(qb, scope);
    });

    it('uses an empty scope by default', async () => {
      const qb = createBuilder(
        ['innerJoin', 'select', 'addSelect', 'where', 'andWhere', 'distinct'],
        ['getRawMany'],
      );
      qb.getRawMany.mockResolvedValue([]);
      itemOrm.createQueryBuilder.mockReturnValue(qb);

      await repository.findByClasses(['c-1']);

      expect(restrictToLiveItems).toHaveBeenCalledWith(qb, {});
    });
  });

  describe('deleteItemsByExam (soft delete)', () => {
    let qb: Builder;

    beforeEach(() => {
      qb = createBuilder(['update', 'set', 'where', 'andWhere'], ['execute']);
      itemOrm.createQueryBuilder.mockReturnValue(qb);
    });

    it('soft-deletes the live items of the class and returns how many', async () => {
      qb.execute.mockResolvedValue({ affected: 1 });

      expect(await repository.deleteItemsByExam('c-1', 'e-1', 'user-1')).toBe(1);

      expect(qb.update).toHaveBeenCalledWith(SectionItem);
      expect(qb.set).toHaveBeenCalledWith({
        deletedAt: expect.any(Function),
        deletedBy: 'user-1',
      });
      const patch = qb.set.mock.calls[0][0] as { deletedAt: () => string };
      expect(patch.deletedAt()).toBe('NOW()');
      expect(qb.where).toHaveBeenCalledWith('exam_id = :examId', { examId: 'e-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'section_id IN (SELECT id FROM sections WHERE class_id = :classId)',
        { classId: 'c-1' },
      );
    });

    it('records null as the deleter when none is given', async () => {
      qb.execute.mockResolvedValue({ affected: 1 });

      await repository.deleteItemsByExam('c-1', 'e-1');

      expect(qb.set).toHaveBeenCalledWith(expect.objectContaining({ deletedBy: null }));
    });

    it('returns 0 when the driver reports no affected count', async () => {
      qb.execute.mockResolvedValue({});

      expect(await repository.deleteItemsByExam('c-1', 'e-1')).toBe(0);
    });
  });

  describe('isExamReferenced', () => {
    it('checks any section item, deleted or not', async () => {
      itemOrm.exists.mockResolvedValue(false);

      expect(await repository.isExamReferenced('e-1')).toBe(false);
      expect(itemOrm.exists).toHaveBeenCalledWith({ where: { examId: 'e-1' } });
    });
  });

  describe('findExamIdsOfClass', () => {
    it('returns an empty list without querying when no ids are given', async () => {
      expect(await repository.findExamIdsOfClass('c-1', [])).toEqual([]);
      expect(examOrm.find).not.toHaveBeenCalled();
    });

    it('returns only the ids that are exams of the class', async () => {
      examOrm.find.mockResolvedValue([{ id: 'e-1' }]);

      expect(await repository.findExamIdsOfClass('c-1', ['e-1', 'e-2'])).toEqual(['e-1']);
      expect(examOrm.find).toHaveBeenCalledWith({
        select: { id: true },
        where: { id: In(['e-1', 'e-2']), classId: 'c-1' },
      });
    });
  });
});