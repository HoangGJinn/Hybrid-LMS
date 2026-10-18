import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassController } from './class.controller.js';
import { ClassService } from '../services/class.service.js';
import { AcademicFacade } from '../facades/academic.facade.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { ClassView } from '../types/class-view.type.js';
import { Class } from '../entities/class.entity.js';

describe('ClassController', () => {
  let controller: ClassController;
  let mockClassService: Partial<Record<keyof ClassService, ReturnType<typeof vi.fn>>>;
  let mockAcademicFacade: Partial<Record<keyof AcademicFacade, ReturnType<typeof vi.fn>>>;

  const sampleClassView: ClassView = {
    id: 'cls-uuid-1',
    classCode: 'CS101.Q11',
    name: 'Intro to Programming',
    isActive: true,
    endedAt: null,
    subjectId: 'sub-uuid-1',
    subjectCode: 'CS101',
    subjectName: 'Intro to CS',
    semesterId: 'sem-uuid-1',
    semesterCode: 'HK1-2026',
    semesterName: 'Học kỳ 1 - 2026',
    lecturerId: 'lec-user-id',
    lecturerName: 'TS. Nguyễn Văn An',
    studentCount: 15,
    progress: 0,
  };

  const sampleClassEntity: Class = {
    id: 'cls-uuid-1',
    classCode: 'CS101.Q11',
    name: 'Intro to Programming',
    isActive: true,
    endedAt: null,
    subjectId: 'sub-uuid-1',
    semesterId: 'sem-uuid-1',
    lecturerId: 'lec-user-id',
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
        email: 'lec@school.edu.vn',
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

  beforeEach(() => {
    mockClassService = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      countStudents: vi.fn(),
      update: vi.fn(),
      deactivate: vi.fn(),
    };
    mockAcademicFacade = {
      getClassesByStudent: vi.fn(),
      getClassesByLecturer: vi.fn(),
    };

    controller = new ClassController(
      mockClassService as unknown as ClassService,
      mockAcademicFacade as unknown as AcademicFacade,
    );
  });

  describe('test', () => {
    it('returns OK string', () => {
      expect(controller.test()).toBe('Class module OK');
    });
  });

  describe('getMyClasses', () => {
    it('returns classes for STUDENT via academicFacade', async () => {
      mockAcademicFacade.getClassesByStudent!.mockResolvedValue([sampleClassView]);
      const studentUser: AuthenticatedUser = {
        id: 'stu-user-id',
        email: 'student@school.edu.vn',
        role: Role.STUDENT,
      };

      const result = await controller.getMyClasses(studentUser);

      expect(mockAcademicFacade.getClassesByStudent).toHaveBeenCalledWith('stu-user-id');
      expect(result).toEqual([sampleClassView]);
    });

    it('returns classes for LECTURER via academicFacade', async () => {
      mockAcademicFacade.getClassesByLecturer!.mockResolvedValue([sampleClassView]);
      const lecturerUser: AuthenticatedUser = {
        id: 'lec-user-id',
        email: 'lecturer@school.edu.vn',
        role: Role.LECTURER,
      };

      const result = await controller.getMyClasses(lecturerUser);

      expect(mockAcademicFacade.getClassesByLecturer).toHaveBeenCalledWith('lec-user-id');
      expect(result).toEqual([sampleClassView]);
    });

    it('returns empty array for ADMIN or other roles', async () => {
      const adminUser: AuthenticatedUser = {
        id: 'adm-user-id',
        email: 'admin@school.edu.vn',
        role: Role.ADMIN,
      };

      const result = await controller.getMyClasses(adminUser);

      expect(mockAcademicFacade.getClassesByStudent).not.toHaveBeenCalled();
      expect(mockAcademicFacade.getClassesByLecturer).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('delegates creation to ClassService', async () => {
      mockClassService.create!.mockResolvedValue(sampleClassView);
      const dto = {
        classCode: 'CS101.Q11',
        name: 'Intro to Programming',
        subjectId: 'sub-uuid-1',
        semesterId: 'sem-uuid-1',
        lecturerId: 'lec-user-id',
      };

      const result = await controller.create(dto);

      expect(mockClassService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(sampleClassView);
    });
  });

  describe('getAll', () => {
    it('delegates to ClassService with filters', async () => {
      mockClassService.findAll!.mockResolvedValue([sampleClassView]);

      const result = await controller.getAll(true, 'sem-uuid-1', 'CS101');

      expect(mockClassService.findAll).toHaveBeenCalledWith({
        isActive: true,
        semesterId: 'sem-uuid-1',
        search: 'CS101',
      });
      expect(result).toEqual([sampleClassView]);
    });
  });

  describe('getById', () => {
    it('returns class details with student count and progress', async () => {
      mockClassService.findById!.mockResolvedValue(sampleClassEntity);
      mockClassService.countStudents!.mockResolvedValue(15);

      const result = await controller.getById('cls-uuid-1');

      expect(mockClassService.findById).toHaveBeenCalledWith('cls-uuid-1');
      expect(mockClassService.countStudents).toHaveBeenCalledWith('cls-uuid-1');
      expect(result.id).toBe('cls-uuid-1');
      expect(result.studentCount).toBe(15);
      expect(result.progress).toBe(0);
      expect(result.lecturerName).toBe('TS. Nguyễn Văn An');
    });
  });

  describe('update', () => {
    it('delegates update to ClassService', async () => {
      const updatedView = { ...sampleClassView, name: 'New Name' };
      mockClassService.update!.mockResolvedValue(updatedView);

      const result = await controller.update('cls-uuid-1', { name: 'New Name' });

      expect(mockClassService.update).toHaveBeenCalledWith('cls-uuid-1', {
        name: 'New Name',
      });
      expect(result.name).toBe('New Name');
    });
  });

  describe('deactivate', () => {
    it('delegates deactivate to ClassService', async () => {
      const deactivatedView = { ...sampleClassView, isActive: false };
      mockClassService.deactivate!.mockResolvedValue(deactivatedView);

      const result = await controller.deactivate('cls-uuid-1');

      expect(mockClassService.deactivate).toHaveBeenCalledWith('cls-uuid-1');
      expect(result.isActive).toBe(false);
    });
  });
});
