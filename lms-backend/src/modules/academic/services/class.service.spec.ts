import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClassService } from './class.service.js';
import { ClassRepository } from '../repositories/class.repository.js';
import { ClassStudentRepository } from '../repositories/class-student.repository.js';
import { ClassAccessPolicy } from '../policies/class-access.policy.js';
import { SubjectService } from './subject.service.js';
import { SemesterService } from './semester.service.js';
import { UserFacade } from '../../user/facades/user.facade.js';
import { Class } from '../entities/class.entity.js';
import { Role } from '../../../common/enums/role.enum.js';
import { UserView } from '../../user/types/user-view.type.js';

describe('ClassService', () => {
  let service: ClassService;
  let mockClassRepo: Partial<
    Record<keyof ClassRepository, ReturnType<typeof vi.fn>>
  >;
  let mockSubjectService: Partial<
    Record<keyof SubjectService, ReturnType<typeof vi.fn>>
  >;
  let mockSemesterService: Partial<
    Record<keyof SemesterService, ReturnType<typeof vi.fn>>
  >;
  let mockUserFacade: Partial<
    Record<keyof UserFacade, ReturnType<typeof vi.fn>>
  >;
  let mockClassStudentRepo: Partial<
    Record<keyof ClassStudentRepository, ReturnType<typeof vi.fn>>
  >;
  let mockAccessPolicy: Partial<
    Record<keyof ClassAccessPolicy, ReturnType<typeof vi.fn>>
  >;

  const sampleClass: Class = {
    id: 'cls-uuid-1',
    classCode: 'CS101.Q11',
    name: 'Intro to Programming - Q11',
    subjectId: 'sub-uuid-1',
    semesterId: 'sem-uuid-1',
    lecturerId: 'lec-user-id',
    isActive: true,
    endedAt: null,
    subject: {
      id: 'sub-uuid-1',
      subjectCode: 'CS101',
      name: 'Intro to CS',
      description: null,
    },
    semester: {
      id: 'sem-uuid-1',
      semesterCode: 'HK1-2026',
      name: 'Học kỳ 1 - 2026',
      startDate: new Date(),
      endDate: new Date(),
    },
    lecturer: {
      userId: 'lec-user-id',
      lecturerCode: 'GV001',
      status: 'WORKING' as any,
      user: {
        id: 'lec-user-id',
        email: 'lecturer@school.edu.vn',
        fullName: 'TS. Nguyễn Văn An',
        role: Role.LECTURER,
        ssoId: 'sso-1',
        ssoProvider: 'GOOGLE',
        avatarUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  };

  const sampleLecturerUser: UserView = {
    id: 'lec-user-id',
    email: 'lecturer@school.edu.vn',
    fullName: 'TS. Nguyễn Văn An',
    role: Role.LECTURER,
    avatarUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockClassRepo = {
      findByCode: vi.fn(),
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      findByLecturerId: vi.fn(),
      findByStudentId: vi.fn(),
      findMyClasses: vi.fn(),
      countStudents: vi.fn(),
      countStudentsBatch: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockSubjectService = {
      findById: vi.fn(),
    };
    mockSemesterService = {
      findById: vi.fn(),
    };
    mockUserFacade = {
      getUserById: vi.fn(),
    };
    mockClassStudentRepo = {
      findByClass: vi.fn().mockResolvedValue([]),
    };
    mockAccessPolicy = {
      assertCanView: vi.fn().mockResolvedValue(undefined),
    };

    service = new ClassService(
      mockClassRepo as unknown as ClassRepository,
      mockSubjectService as unknown as SubjectService,
      mockSemesterService as unknown as SemesterService,
      mockUserFacade as unknown as UserFacade,
      mockClassStudentRepo as unknown as ClassStudentRepository,
      mockAccessPolicy as unknown as ClassAccessPolicy,
    );
  });

  describe('create', () => {
    const createDto = {
      classCode: 'CS101.Q11',
      name: 'Intro to Programming - Q11',
      subjectId: 'sub-uuid-1',
      semesterId: 'sem-uuid-1',
      lecturerId: 'lec-user-id',
    };

    it('creates class successfully when all foreign keys are valid', async () => {
      mockClassRepo.findByCode!.mockResolvedValue(null);
      mockSubjectService.findById!.mockResolvedValue({
        id: 'sub-uuid-1',
      } as any);
      mockSemesterService.findById!.mockResolvedValue({
        id: 'sem-uuid-1',
      } as any);
      mockUserFacade.getUserById!.mockResolvedValue(sampleLecturerUser);
      mockClassRepo.create!.mockResolvedValue(sampleClass);
      mockClassRepo.findById!.mockResolvedValue(sampleClass);

      const result = await service.create(createDto);

      expect(mockClassRepo.findByCode).toHaveBeenCalledWith('CS101.Q11');
      expect(mockSubjectService.findById).toHaveBeenCalledWith('sub-uuid-1');
      expect(mockSemesterService.findById).toHaveBeenCalledWith('sem-uuid-1');
      expect(mockUserFacade.getUserById).toHaveBeenCalledWith('lec-user-id');
      expect(result.classCode).toBe('CS101.Q11');
      expect(result.studentCount).toBe(0);
      expect(result.progress).toBe(0);
    });

    it('throws ConflictException if classCode already exists', async () => {
      mockClassRepo.findByCode!.mockResolvedValue(sampleClass);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws BadRequestException if subject does not exist', async () => {
      mockClassRepo.findByCode!.mockResolvedValue(null);
      mockSubjectService.findById!.mockRejectedValue(new Error('Not found'));

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if semester does not exist', async () => {
      mockClassRepo.findByCode!.mockResolvedValue(null);
      mockSubjectService.findById!.mockResolvedValue({
        id: 'sub-uuid-1',
      } as any);
      mockSemesterService.findById!.mockRejectedValue(new Error('Not found'));

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if lecturer does not exist', async () => {
      mockClassRepo.findByCode!.mockResolvedValue(null);
      mockSubjectService.findById!.mockResolvedValue({
        id: 'sub-uuid-1',
      } as any);
      mockSemesterService.findById!.mockResolvedValue({
        id: 'sem-uuid-1',
      } as any);
      mockUserFacade.getUserById!.mockRejectedValue(new Error('Not found'));

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if user is not a lecturer', async () => {
      mockClassRepo.findByCode!.mockResolvedValue(null);
      mockSubjectService.findById!.mockResolvedValue({
        id: 'sub-uuid-1',
      } as any);
      mockSemesterService.findById!.mockResolvedValue({
        id: 'sem-uuid-1',
      } as any);
      mockUserFacade.getUserById!.mockResolvedValue({
        ...sampleLecturerUser,
        role: Role.STUDENT,
      });

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('returns classes with student counts', async () => {
      mockClassRepo.findAll!.mockResolvedValue([sampleClass]);
      const countsMap = new Map([['cls-uuid-1', 42]]);
      mockClassRepo.countStudentsBatch!.mockResolvedValue(countsMap);

      const result = await service.findAll({ isActive: true });

      expect(result).toHaveLength(1);
      expect(result[0].studentCount).toBe(42);
      expect(result[0].classCode).toBe('CS101.Q11');
      expect(result[0].progress).toBe(0);
    });
  });

  describe('findById', () => {
    it('returns class entity when found', async () => {
      mockClassRepo.findById!.mockResolvedValue(sampleClass);
      const result = await service.findById('cls-uuid-1');
      expect(result).toEqual(sampleClass);
    });

    it('throws NotFoundException when not found', async () => {
      mockClassRepo.findById!.mockResolvedValue(null);
      await expect(service.findById('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByLecturer', () => {
    it('calls repository findByLecturerId', async () => {
      mockClassRepo.findByLecturerId!.mockResolvedValue([sampleClass]);
      const result = await service.findByLecturer('lec-user-id');
      expect(mockClassRepo.findByLecturerId).toHaveBeenCalledWith(
        'lec-user-id',
      );
      expect(result).toEqual([sampleClass]);
    });
  });

  describe('findByStudent', () => {
    it('calls repository findByStudentId', async () => {
      mockClassRepo.findByStudentId!.mockResolvedValue([sampleClass]);
      const result = await service.findByStudent('stu-user-id');
      expect(mockClassRepo.findByStudentId).toHaveBeenCalledWith('stu-user-id');
      expect(result).toEqual([sampleClass]);
    });
  });

  describe('findMyClasses', () => {
    it('returns paginated classes with student counts', async () => {
      mockClassRepo.findMyClasses!.mockResolvedValue([[sampleClass], 1]);
      mockClassRepo.countStudentsBatch!.mockResolvedValue(
        new Map([['cls-uuid-1', 25]]),
      );

      const result = await service.findMyClasses('user-1', Role.STUDENT, {
        page: 1,
        limit: 6,
      });

      expect(mockClassRepo.findMyClasses).toHaveBeenCalledWith(
        'user-1',
        Role.STUDENT,
        { page: 1, limit: 6 },
      );
      expect(mockClassRepo.countStudentsBatch).toHaveBeenCalledWith([
        'cls-uuid-1',
      ]);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].studentCount).toBe(25);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(6);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('deactivate', () => {
    it('deactivates an active class', async () => {
      mockClassRepo
        .findById!.mockResolvedValueOnce(sampleClass)
        .mockResolvedValueOnce({
          ...sampleClass,
          isActive: false,
          endedAt: new Date(),
        });
      mockClassRepo.update!.mockResolvedValue(undefined);
      mockClassRepo.countStudents!.mockResolvedValue(10);

      const result = await service.deactivate('cls-uuid-1');
      expect(mockClassRepo.update).toHaveBeenCalledWith('cls-uuid-1', {
        isActive: false,
        endedAt: expect.any(Date),
      });
      expect(result.isActive).toBe(false);
      expect(result.studentCount).toBe(10);
    });

    it('throws ConflictException if class is already deactivated', async () => {
      mockClassRepo.findById!.mockResolvedValue({
        ...sampleClass,
        isActive: false,
      });

      await expect(service.deactivate('cls-uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('updates class fields successfully', async () => {
      mockClassRepo
        .findById!.mockResolvedValueOnce(sampleClass)
        .mockResolvedValueOnce({ ...sampleClass, name: 'Updated Class Name' });
      mockClassRepo.update!.mockResolvedValue(undefined);
      mockClassRepo.countStudents!.mockResolvedValue(5);

      const result = await service.update('cls-uuid-1', {
        name: 'Updated Class Name',
      });

      expect(mockClassRepo.update).toHaveBeenCalledWith('cls-uuid-1', {
        name: 'Updated Class Name',
      });
      expect(result.name).toBe('Updated Class Name');
    });

    it('throws ConflictException if new classCode is already taken', async () => {
      mockClassRepo.findById!.mockResolvedValue(sampleClass);
      mockClassRepo.findByCode!.mockResolvedValue({
        id: 'another-class',
        classCode: 'CS102',
      });

      await expect(
        service.update('cls-uuid-1', { classCode: 'CS102' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getClassmates', () => {
    const student = { id: 'stu-1', role: Role.STUDENT } as any;
    const enrollment = {
      classId: 'cls-uuid-1',
      studentId: 'stu-1',
      student: {
        studentCode: 'SV26000001',
        user: { fullName: 'Nguyen Van A', email: 'a@school.edu.vn' },
      },
    };

    it('checks view access and reads the enrolments from ClassStudentRepository', async () => {
      mockClassRepo.findById!.mockResolvedValue(sampleClass);
      mockClassStudentRepo.findByClass!.mockResolvedValue([enrollment]);

      const result = await service.getClassmates('cls-uuid-1', student);

      expect(mockAccessPolicy.assertCanView).toHaveBeenCalledWith(
        sampleClass,
        student,
      );
      expect(mockClassStudentRepo.findByClass).toHaveBeenCalledWith(
        'cls-uuid-1',
      );
      expect(result).toEqual([
        {
          id: 'stu-1',
          classId: 'cls-uuid-1',
          studentCode: 'SV26000001',
          fullName: 'Nguyen Van A',
          email: 'a@school.edu.vn',
        },
      ]);
    });

    it('does not read the enrolments when access is refused', async () => {
      mockClassRepo.findById!.mockResolvedValue(sampleClass);
      mockAccessPolicy.assertCanView!.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        service.getClassmates('cls-uuid-1', student),
      ).rejects.toThrow(ForbiddenException);
      expect(mockClassStudentRepo.findByClass).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown class', async () => {
      mockClassRepo.findById!.mockResolvedValue(null);

      await expect(
        service.getClassmates('unknown', student),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRoster', () => {
    const lecturer = { id: 'lec-user-id', role: Role.LECTURER } as any;

    it('refuses students before touching the database', async () => {
      await expect(
        service.getRoster('cls-uuid-1', { id: 'stu-1', role: Role.STUDENT } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(mockClassRepo.findById).not.toHaveBeenCalled();
    });

    it('returns roster rows with placeholder stats', async () => {
      mockClassRepo.findById!.mockResolvedValue(sampleClass);
      mockClassStudentRepo.findByClass!.mockResolvedValue([
        {
          classId: 'cls-uuid-1',
          studentId: 'stu-1',
          student: {
            studentCode: 'SV26000001',
            user: { fullName: 'Nguyen Van A', email: 'a@school.edu.vn' },
          },
        },
      ]);

      const result = await service.getRoster('cls-uuid-1', lecturer);

      expect(mockAccessPolicy.assertCanView).toHaveBeenCalledWith(
        sampleClass,
        lecturer,
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'stu-1',
        avgScore: null,
        avgMastery: 0,
        atRisk: false,
      });
    });

    it('does not read the enrolments when access is refused', async () => {
      mockClassRepo.findById!.mockResolvedValue(sampleClass);
      mockAccessPolicy.assertCanView!.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(service.getRoster('cls-uuid-1', lecturer)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockClassStudentRepo.findByClass).not.toHaveBeenCalled();
    });
  });

  describe('aliases and auxiliary methods', () => {
    it('creates class using createClass alias', async () => {
      mockClassRepo.findByCode!.mockResolvedValue(null);
      mockSubjectService.findById!.mockResolvedValue({
        id: 'sub-uuid-1',
      } as any);
      mockSemesterService.findById!.mockResolvedValue({
        id: 'sem-uuid-1',
      } as any);
      mockUserFacade.getUserById!.mockResolvedValue(sampleLecturerUser);
      mockClassRepo.create!.mockResolvedValue(sampleClass);
      mockClassRepo.findById!.mockResolvedValue(sampleClass);

      const res = await service.createClass({
        classCode: 'CS101.Q11',
        name: 'Class Alias Test',
        subjectId: 'sub-uuid-1',
        semesterId: 'sem-uuid-1',
        lecturerId: 'lec-user-id',
      });
      expect(res.classCode).toBe('CS101.Q11');
    });

    it('finds one by findOne alias', async () => {
      mockClassRepo.findById!.mockResolvedValue(sampleClass);
      const res = await service.findOne('cls-uuid-1');
      expect(res).toEqual(sampleClass);
    });

    it('updates class using updateClass alias', async () => {
      mockClassRepo
        .findById!.mockResolvedValueOnce(sampleClass)
        .mockResolvedValueOnce(sampleClass);
      mockClassRepo.update!.mockResolvedValue(undefined);
      mockClassRepo.countStudents!.mockResolvedValue(5);

      const res = await service.updateClass('cls-uuid-1', {
        name: 'Alias Update',
      });
      expect(res.id).toBe('cls-uuid-1');
    });

    it('deactivates class using deactivateClass alias', async () => {
      mockClassRepo
        .findById!.mockResolvedValueOnce(sampleClass)
        .mockResolvedValueOnce({
          ...sampleClass,
          isActive: false,
          endedAt: new Date(),
        });
      mockClassRepo.update!.mockResolvedValue(undefined);
      mockClassRepo.countStudents!.mockResolvedValue(0);

      const res = await service.deactivateClass('cls-uuid-1');
      expect(res.isActive).toBe(false);
    });

    it('deletes class if found', async () => {
      mockClassRepo.findById!.mockResolvedValue(sampleClass);
      mockClassRepo.delete!.mockResolvedValue(undefined);

      await expect(service.delete('cls-uuid-1')).resolves.toBeUndefined();
      expect(mockClassRepo.delete).toHaveBeenCalledWith('cls-uuid-1');
    });

    it('delegates countStudents and countStudentsBatch', async () => {
      mockClassRepo.countStudents!.mockResolvedValue(10);
      mockClassRepo.countStudentsBatch!.mockResolvedValue(
        new Map([['cls-1', 10]]),
      );

      expect(await service.countStudents('cls-1')).toBe(10);
      const batchRes = await service.countStudentsBatch(['cls-1']);
      expect(batchRes.get('cls-1')).toBe(10);
    });
  });
});
