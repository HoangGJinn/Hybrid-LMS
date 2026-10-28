import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Repository } from 'typeorm';
import { ClassStudentRepository } from './class-student.repository.js';
import { ClassStudent } from '../entities/class-student.entity.js';

describe('ClassStudentRepository', () => {
  let repository: ClassStudentRepository;
  let mockRepo: Partial<
    Record<keyof Repository<ClassStudent>, ReturnType<typeof vi.fn>>
  >;

  beforeEach(() => {
    mockRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      count: vi.fn(),
      insert: vi.fn(),
      delete: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    repository = new ClassStudentRepository(
      mockRepo as unknown as Repository<ClassStudent>,
    );
  });

  describe('findByClass', () => {
    const createQueryMock = () => {
      const qb = {
        innerJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      mockRepo.createQueryBuilder!.mockReturnValue(qb);
      return qb;
    };

    it('lists the class participants ordered by student code', async () => {
      const qb = createQueryMock();

      await repository.findByClass('cls-1');

      expect(qb.where).toHaveBeenCalledWith('cs.classId = :classId', {
        classId: 'cls-1',
      });
      expect(qb.orderBy).toHaveBeenCalledWith('student.studentCode', 'ASC');
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('filters by name, email or code and matches the text literally', async () => {
      const qb = createQueryMock();

      await repository.findByClass('cls-1', '50%');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('student.studentCode ILIKE :search'),
        { search: '%50\\%%' },
      );
    });
  });

  it('collects the ids of the enrolled students', async () => {
    mockRepo.find!.mockResolvedValue([{ studentId: 'a' }, { studentId: 'b' }]);

    expect(await repository.findStudentIds('cls-1')).toEqual(
      new Set(['a', 'b']),
    );
  });

  it('tells whether a student is in the class', async () => {
    mockRepo.count!.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    expect(await repository.exists('cls-1', 'stu-1')).toBe(true);
    expect(await repository.exists('cls-1', 'stu-1')).toBe(false);
  });

  it('inserts a single enrolment', async () => {
    await repository.add('cls-1', 'stu-1');

    expect(mockRepo.insert).toHaveBeenCalledWith({
      classId: 'cls-1',
      studentId: 'stu-1',
    });
  });

  describe('addMany', () => {
    it('does nothing for an empty list', async () => {
      await repository.addMany('cls-1', []);

      expect(mockRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('inserts all students in one statement and skips existing ones', async () => {
      const qb = {
        insert: vi.fn().mockReturnThis(),
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        orIgnore: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(undefined),
      };
      mockRepo.createQueryBuilder!.mockReturnValue(qb);

      await repository.addMany('cls-1', ['a', 'b']);

      expect(qb.into).toHaveBeenCalledWith(ClassStudent);
      expect(qb.values).toHaveBeenCalledWith([
        { classId: 'cls-1', studentId: 'a' },
        { classId: 'cls-1', studentId: 'b' },
      ]);
      expect(qb.orIgnore).toHaveBeenCalled();
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  it('reports whether a row was removed', async () => {
    mockRepo.delete!
      .mockResolvedValueOnce({ affected: 1 })
      .mockResolvedValueOnce({ affected: 0 });

    expect(await repository.remove('cls-1', 'stu-1')).toBe(true);
    expect(await repository.remove('cls-1', 'stu-1')).toBe(false);
  });
});
