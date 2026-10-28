import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AcademicFacade } from './academic.facade.js';
import { ClassService } from '../services/class.service.js';
import { SubjectService } from '../services/subject.service.js';
import { SemesterService } from '../services/semester.service.js';
import { ClassAccessPolicy } from '../policies/class-access.policy.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '../../../common/enums/role.enum.js';
import { Class } from '../entities/class.entity.js';
import { Subject } from '../entities/subject.entity.js';
import { Semester } from '../entities/semester.entity.js';

describe('AcademicFacade', () => {
  let facade: AcademicFacade;
  let mockClassService: Partial<
    Record<keyof ClassService, ReturnType<typeof vi.fn>>
  >;
  let mockSubjectService: Partial<
    Record<keyof SubjectService, ReturnType<typeof vi.fn>>
  >;
  let mockSemesterService: Partial<
    Record<keyof SemesterService, ReturnType<typeof vi.fn>>
  >;

  let mockAccessPolicy: Partial<
    Record<keyof ClassAccessPolicy, ReturnType<typeof vi.fn>>
  >;

  const sampleClass = {
    id: 'cls-1',
    classCode: 'CS101.Q1',
    name: 'Intro CS Q1',
    subjectId: 'sub-1',
    semesterId: 'sem-1',
    lecturerId: 'lec-1',
    isActive: true,
    endedAt: null,
  } as Class;

  const sampleSubject: Subject = {
    id: 'sub-1',
    subjectCode: 'CS101',
    name: 'Intro to CS',
    description: null,
  };

  const sampleSemester: Semester = {
    id: 'sem-1',
    semesterCode: 'HK1-2026',
    name: 'Học kỳ 1 - 2026',
    startDate: new Date(),
    endDate: new Date(),
  };

  beforeEach(() => {
    mockClassService = {
      findById: vi.fn(),
      findByLecturer: vi.fn(),
      findByStudent: vi.fn(),
      findAll: vi.fn(),
      countStudents: vi.fn(),
      countStudentsBatch: vi.fn(),
    };
    mockSubjectService = {
      findById: vi.fn(),
      findAll: vi.fn(),
    };
    mockSemesterService = {
      findById: vi.fn(),
      findAll: vi.fn(),
      getActiveSemester: vi.fn(),
    };
    mockAccessPolicy = {
      assertCanView: vi.fn().mockResolvedValue(undefined),
      assertCanManage: vi.fn(),
    };

    facade = new AcademicFacade(
      mockClassService as unknown as ClassService,
      mockSubjectService as unknown as SubjectService,
      mockSemesterService as unknown as SemesterService,
      mockAccessPolicy as unknown as ClassAccessPolicy,
    );
  });

  describe('class access checks', () => {
    const user = { id: 'lec-1', role: Role.LECTURER } as any;

    it('assertCanViewClass loads the class and applies the view rule', async () => {
      mockClassService.findById!.mockResolvedValue(sampleClass);

      await facade.assertCanViewClass('cls-1', user);

      expect(mockClassService.findById).toHaveBeenCalledWith('cls-1');
      expect(mockAccessPolicy.assertCanView).toHaveBeenCalledWith(
        sampleClass,
        user,
      );
    });

    it('assertCanViewClass propagates a refusal', async () => {
      mockClassService.findById!.mockResolvedValue(sampleClass);
      mockAccessPolicy.assertCanView!.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(facade.assertCanViewClass('cls-1', user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('assertCanManageClass loads the class and applies the manage rule', async () => {
      mockClassService.findById!.mockResolvedValue(sampleClass);

      await facade.assertCanManageClass('cls-1', user);

      expect(mockAccessPolicy.assertCanManage).toHaveBeenCalledWith(
        sampleClass,
        user,
      );
    });

    it('assertCanManageClass propagates a refusal', async () => {
      mockClassService.findById!.mockResolvedValue(sampleClass);
      mockAccessPolicy.assertCanManage!.mockImplementation(() => {
        throw new ForbiddenException();
      });

      await expect(facade.assertCanManageClass('cls-1', user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('does not apply the rule when the class does not exist', async () => {
      mockClassService.findById!.mockRejectedValue(new NotFoundException());

      await expect(facade.assertCanManageClass('nope', user)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockAccessPolicy.assertCanManage).not.toHaveBeenCalled();
    });
  });

  describe('getClassById', () => {
    it('returns projection with count', async () => {
      mockClassService.findById!.mockResolvedValue(sampleClass);
      mockClassService.countStudents!.mockResolvedValue(20);

      const result = await facade.getClassById('cls-1');

      expect(mockClassService.findById).toHaveBeenCalledWith('cls-1');
      expect(mockClassService.countStudents).toHaveBeenCalledWith('cls-1');
      expect(result.id).toBe('cls-1');
      expect(result.studentCount).toBe(20);
    });
  });

  describe('getClassesByLecturer', () => {
    it('returns classes with batch student counts', async () => {
      mockClassService.findByLecturer!.mockResolvedValue([sampleClass]);
      mockClassService.countStudentsBatch!.mockResolvedValue(
        new Map([['cls-1', 12]]),
      );

      const result = await facade.getClassesByLecturer('lec-1');

      expect(mockClassService.findByLecturer).toHaveBeenCalledWith('lec-1');
      expect(result).toHaveLength(1);
      expect(result[0].studentCount).toBe(12);
    });
  });

  describe('getClassesByStudent', () => {
    it('returns classes enrolled by student', async () => {
      mockClassService.findByStudent!.mockResolvedValue([sampleClass]);
      mockClassService.countStudentsBatch!.mockResolvedValue(
        new Map([['cls-1', 15]]),
      );

      const result = await facade.getClassesByStudent('stu-1');

      expect(mockClassService.findByStudent).toHaveBeenCalledWith('stu-1');
      expect(result).toHaveLength(1);
      expect(result[0].studentCount).toBe(15);
    });
  });

  describe('subjects and semesters queries', () => {
    it('delegates subject methods', async () => {
      mockSubjectService.findById!.mockResolvedValue(sampleSubject);
      mockSubjectService.findAll!.mockResolvedValue([sampleSubject]);

      const sub = await facade.getSubjectById('sub-1');
      expect(sub.id).toBe('sub-1');

      const allSubs = await facade.getAllSubjects();
      expect(allSubs).toHaveLength(1);
    });

    it('delegates semester methods', async () => {
      mockSemesterService.findById!.mockResolvedValue(sampleSemester);
      mockSemesterService.findAll!.mockResolvedValue([sampleSemester]);
      mockSemesterService.getActiveSemester!.mockResolvedValue(sampleSemester);

      const sem = await facade.getSemesterById('sem-1');
      expect(sem.id).toBe('sem-1');

      const allSems = await facade.getAllSemesters();
      expect(allSems).toHaveLength(1);

      const active = await facade.getActiveSemester();
      expect(active?.id).toBe('sem-1');
    });
  });
});
