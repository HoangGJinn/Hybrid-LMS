import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Repository } from 'typeorm';
import { ClassRepository } from './class.repository.js';
import { Class } from '../entities/class.entity.js';
import { ClassStudent } from '../entities/class-student.entity.js';
import { Role } from '../../../common/enums/role.enum.js';

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

  describe('findMyClasses', () => {
    function mockMyClassesQuery(rows: Class[], total: number) {
      const qb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([rows, total]),
      };
      mockClassRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it('queries classes for a student with default pagination and sorting', async () => {
      const qb = mockMyClassesQuery([sampleClass], 1);

      const [items, total] = await repository.findMyClasses(
        'student-1',
        Role.STUDENT,
        {},
      );

      expect(mockClassRepo.createQueryBuilder).toHaveBeenCalledWith('c');
      expect(qb.innerJoin).toHaveBeenCalledWith(
        ClassStudent,
        'cs',
        'cs.classId = c.id AND cs.studentId = :studentId',
        { studentId: 'student-1' },
      );
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(6);
      expect(qb.orderBy).toHaveBeenCalledWith('c.classCode', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('c.name', 'ASC');
      expect(items).toEqual([sampleClass]);
      expect(total).toBe(1);
    });

    it('queries classes for a lecturer and filters by lecturerId', async () => {
      const qb = mockMyClassesQuery([sampleClass], 1);

      await repository.findMyClasses('lecturer-1', Role.LECTURER, {
        page: 2,
        limit: 10,
        sort: 'name',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'c.lecturerId = :lecturerId',
        { lecturerId: 'lecturer-1' },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('c.name', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('c.classCode', 'ASC');
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('applies search filter when search string is provided', async () => {
      const qb = mockMyClassesQuery([sampleClass], 1);

      await repository.findMyClasses('student-1', Role.STUDENT, {
        search: 'Intro',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(c.name ILIKE :search OR c.classCode ILIKE :search)',
        { search: '%Intro%' },
      );
    });

    it('applies in_progress status filter', async () => {
      const qb = mockMyClassesQuery([sampleClass], 1);

      await repository.findMyClasses('student-1', Role.STUDENT, {
        status: 'in_progress',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('c.isActive = true');
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(semester.endDate IS NULL OR semester.endDate >= :now) AND (semester.startDate IS NULL OR semester.startDate <= :now)',
        expect.objectContaining({ now: expect.any(Date) }),
      );
    });

    it('applies future status filter', async () => {
      const qb = mockMyClassesQuery([sampleClass], 1);

      await repository.findMyClasses('student-1', Role.STUDENT, {
        status: 'future',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('c.isActive = true');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'semester.startDate IS NOT NULL AND semester.startDate > :now',
        expect.objectContaining({ now: expect.any(Date) }),
      );
    });

    it('applies past status filter', async () => {
      const qb = mockMyClassesQuery([sampleClass], 1);

      await repository.findMyClasses('student-1', Role.STUDENT, {
        status: 'past',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(c.isActive = false OR (semester.endDate IS NOT NULL AND semester.endDate < :now))',
        expect.objectContaining({ now: expect.any(Date) }),
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
});