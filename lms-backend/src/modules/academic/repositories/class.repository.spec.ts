import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Repository } from 'typeorm';
import { ClassRepository } from './class.repository.js';
import { Class } from '../entities/class.entity.js';
import { ClassStudent } from '../entities/class-student.entity.js';

type Mock = ReturnType<typeof vi.fn>;

describe('ClassRepository', () => {
  let repository: ClassRepository;
  let mockClassRepo: {
    create: Mock;
    save: Mock;
    findOne: Mock;
    find: Mock;
    update: Mock;
    delete: Mock;
    createQueryBuilder: Mock;
  };
  let mockClassStudentRepo: {
    find: Mock;
    count: Mock;
    exists: Mock;
    createQueryBuilder: Mock;
  };

  const sampleClass = {
    id: 'class-1',
    classCode: 'IT101-01',
    name: 'Intro to IT',
    isActive: true,
  } as unknown as Class;

  const expectedRelations = {
    subject: true,
    semester: true,
    lecturer: { user: true },
  };

  beforeEach(() => {
    mockClassRepo = {
      create: vi.fn((data: Partial<Class>) => data),
      save: vi.fn(async (data: Partial<Class>) => ({ id: 'class-1', ...data })),
      findOne: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    mockClassStudentRepo = {
      find: vi.fn(),
      count: vi.fn(),
      exists: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    repository = new ClassRepository(
      mockClassRepo as unknown as Repository<Class>,
      mockClassStudentRepo as unknown as Repository<ClassStudent>,
    );
  });

  describe('create', () => {
    it('creates and saves a class entity', async () => {
      const data = { classCode: 'IT101-01', name: 'Intro to IT' };
      const result = await repository.create(data);

      expect(mockClassRepo.create).toHaveBeenCalledWith(data);
      expect(mockClassRepo.save).toHaveBeenCalledWith(data);
      expect(result.id).toBe('class-1');
    });
  });

  describe('findAll', () => {
    function mockListQuery(rows: Class[]) {
      const qb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(rows),
      };
      mockClassRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it('lists classes with relations ordered by class code when no filter is given', async () => {
      const qb = mockListQuery([sampleClass]);

      const result = await repository.findAll();

      expect(mockClassRepo.createQueryBuilder).toHaveBeenCalledWith('c');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('c.subject', 'subject');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('c.semester', 'semester');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('c.lecturer', 'lecturer');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'lecturer.user',
        'lecturerUser',
      );
      expect(qb.orderBy).toHaveBeenCalledWith('c.classCode', 'ASC');
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual([sampleClass]);
    });

    it('filters by isActive, including false', async () => {
      const qb = mockListQuery([]);

      await repository.findAll({ isActive: false });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('c.isActive = :isActive', {
        isActive: false,
      });
    });

    it('filters by semester and subject', async () => {
      const qb = mockListQuery([]);

      await repository.findAll({ semesterId: 'sem-1', subjectId: 'sub-1' });

      expect(qb.andWhere).toHaveBeenCalledWith('c.semesterId = :semesterId', {
        semesterId: 'sem-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('c.subjectId = :subjectId', {
        subjectId: 'sub-1',
      });
    });

    it('filters by search text on name or class code', async () => {
      const qb = mockListQuery([]);

      await repository.findAll({ search: 'intro' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(c.name ILIKE :search OR c.classCode ILIKE :search)',
        { search: '%intro%' },
      );
    });

    it('applies every filter together', async () => {
      const qb = mockListQuery([]);

      await repository.findAll({
        isActive: true,
        semesterId: 'sem-1',
        subjectId: 'sub-1',
        search: 'it',
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(4);
    });

    it('ignores empty string filters', async () => {
      const qb = mockListQuery([]);

      await repository.findAll({ semesterId: '', subjectId: '', search: '' });

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findById and findByCode', () => {
    it('finds a class by id with its relations', async () => {
      mockClassRepo.findOne.mockResolvedValue(sampleClass);

      const result = await repository.findById('class-1');

      expect(mockClassRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'class-1' },
        relations: expectedRelations,
      });
      expect(result).toEqual(sampleClass);
    });

    it('returns null when the id does not exist', async () => {
      mockClassRepo.findOne.mockResolvedValue(null);

      await expect(repository.findById('missing')).resolves.toBeNull();
    });

    it('finds a class by code', async () => {
      mockClassRepo.findOne.mockResolvedValue(sampleClass);

      const result = await repository.findByCode('IT101-01');

      expect(mockClassRepo.findOne).toHaveBeenCalledWith({
        where: { classCode: 'IT101-01' },
      });
      expect(result).toEqual(sampleClass);
    });
  });

  describe('findByLecturerId', () => {
    it('lists the active classes of the lecturer ordered by class code', async () => {
      mockClassRepo.find.mockResolvedValue([sampleClass]);

      const result = await repository.findByLecturerId('lec-1');

      expect(mockClassRepo.find).toHaveBeenCalledWith({
        where: { lecturerId: 'lec-1', isActive: true },
        relations: expectedRelations,
        order: { classCode: 'ASC' },
      });
      expect(result).toEqual([sampleClass]);
    });
  });

  describe('findByStudentId', () => {
    it('returns only the active classes the student is enrolled in', async () => {
      const inactiveClass = { ...sampleClass, id: 'class-2', isActive: false };
      mockClassStudentRepo.find.mockResolvedValue([
        { class: sampleClass },
        { class: inactiveClass },
        { class: undefined },
      ]);

      const result = await repository.findByStudentId('stu-1');

      expect(mockClassStudentRepo.find).toHaveBeenCalledWith({
        where: { studentId: 'stu-1' },
        relations: { class: expectedRelations },
      });
      expect(result).toEqual([sampleClass]);
    });

    it('returns an empty list when the student has no enrolments', async () => {
      mockClassStudentRepo.find.mockResolvedValue([]);

      await expect(repository.findByStudentId('stu-1')).resolves.toEqual([]);
    });
  });

  describe('countStudents', () => {
    it('counts the students of the class', async () => {
      mockClassStudentRepo.count.mockResolvedValue(25);

      const result = await repository.countStudents('class-1');

      expect(mockClassStudentRepo.count).toHaveBeenCalledWith({
        where: { classId: 'class-1' },
      });
      expect(result).toBe(25);
    });
  });

  describe('countStudentsBatch', () => {
    it('returns an empty map without querying when no class ids are given', async () => {
      const result = await repository.countStudentsBatch([]);

      expect(result.size).toBe(0);
      expect(mockClassStudentRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('counts per class and defaults classes without students to 0', async () => {
      const qb = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([{ classId: 'class-1', count: '12' }]),
      };
      mockClassStudentRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await repository.countStudentsBatch(['class-1', 'class-2']);

      expect(qb.where).toHaveBeenCalledWith('cs.class_id IN (:...classIds)', {
        classIds: ['class-1', 'class-2'],
      });
      expect(qb.groupBy).toHaveBeenCalledWith('cs.class_id');
      expect(result).toEqual(
        new Map([
          ['class-1', 12],
          ['class-2', 0],
        ]),
      );
    });
  });

  describe('update and delete', () => {
    it('delegates update to the typeorm repo', async () => {
      mockClassRepo.update.mockResolvedValue(undefined);

      await repository.update('class-1', { name: 'Renamed' });

      expect(mockClassRepo.update).toHaveBeenCalledWith('class-1', {
        name: 'Renamed',
      });
    });

    it('delegates delete to the typeorm repo', async () => {
      mockClassRepo.delete.mockResolvedValue(undefined);

      await repository.delete('class-1');

      expect(mockClassRepo.delete).toHaveBeenCalledWith('class-1');
    });
  });

  describe('findEnrollments', () => {
    it('lists the enrolments of the class ordered by student code', async () => {
      const rows = [{ classId: 'class-1', studentId: 'stu-1' }];
      mockClassStudentRepo.find.mockResolvedValue(rows);

      const result = await repository.findEnrollments('class-1');

      expect(mockClassStudentRepo.find).toHaveBeenCalledWith({
        where: { classId: 'class-1' },
        relations: { student: { user: true } },
        order: { student: { studentCode: 'ASC' } },
      });
      expect(result).toBe(rows);
    });
  });

  describe('isEnrolled', () => {
    it('returns true when the student is enrolled', async () => {
      mockClassStudentRepo.exists.mockResolvedValue(true);

      await expect(repository.isEnrolled('class-1', 'stu-1')).resolves.toBe(true);
      expect(mockClassStudentRepo.exists).toHaveBeenCalledWith({
        where: { classId: 'class-1', studentId: 'stu-1' },
      });
    });

    it('returns false when the student is not enrolled', async () => {
      mockClassStudentRepo.exists.mockResolvedValue(false);

      await expect(repository.isEnrolled('class-1', 'stu-1')).resolves.toBe(false);
    });
  });
});