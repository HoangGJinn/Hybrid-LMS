import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassController } from './class.controller.js';
import { ClassService } from '../services/class.service.js';
import { ClassDataImportService } from '../services/class-data-import.service.js';
import { ClassExportService } from '../services/class-export.service.js';
import { ClassImportService } from '../services/class-import.service.js';
import { AcademicFacade } from '../facades/academic.facade.js';
import type { Response } from 'express';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { ClassView } from '../types/class-view.type.js';
import { Class } from '../entities/class.entity.js';

describe('ClassController', () => {
  let controller: ClassController;
  let mockClassService: Partial<
    Record<keyof ClassService, ReturnType<typeof vi.fn>>
  >;
  let mockImportService: Record<keyof ClassImportService, ReturnType<typeof vi.fn>>;
  let mockDataImportService: Record<keyof ClassDataImportService, ReturnType<typeof vi.fn>>;
  let mockExportService: Record<keyof ClassExportService, ReturnType<typeof vi.fn>>;
  let mockAcademicFacade: Partial<
    Record<keyof AcademicFacade, ReturnType<typeof vi.fn>>
  >;

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
        passwordHash: null,
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
      findMyClasses: vi.fn(),
    };
    mockImportService = { importClasses: vi.fn(), plan: vi.fn() };
    mockDataImportService = { importData: vi.fn() };
    const file = { fileName: 'Classes.xlsx', buffer: Buffer.from('xlsx') };
    mockExportService = {
      getLecturerClasses: vi.fn().mockResolvedValue([]),
      getStudentClasses: vi.fn().mockResolvedValue([]),
      exportLecturerClasses: vi.fn().mockResolvedValue(file),
      exportStudentClasses: vi.fn().mockResolvedValue(file),
    };
    mockAcademicFacade = {
      getClassesByStudent: vi.fn(),
      getClassesByLecturer: vi.fn(),
    };

    controller = new ClassController(
      mockClassService as unknown as ClassService,
      mockImportService as unknown as ClassImportService,
      mockDataImportService as unknown as ClassDataImportService,
      mockExportService as unknown as ClassExportService,
      mockAcademicFacade as unknown as AcademicFacade,
    );
  });

  describe('getMyClasses', () => {
    it('returns classes for STUDENT via academicFacade', async () => {
      mockAcademicFacade.getClassesByStudent!.mockResolvedValue([
        sampleClassView,
      ]);
      const studentUser: AuthenticatedUser = {
        id: 'stu-user-id',
        email: 'student@school.edu.vn',
        role: Role.STUDENT,
      };

      const result = await controller.getMyClasses(studentUser);

      expect(mockAcademicFacade.getClassesByStudent).toHaveBeenCalledWith(
        'stu-user-id',
      );
      expect(result).toEqual([sampleClassView]);
    });

    it('returns classes for LECTURER via academicFacade', async () => {
      mockAcademicFacade.getClassesByLecturer!.mockResolvedValue([
        sampleClassView,
      ]);
      const lecturerUser: AuthenticatedUser = {
        id: 'lec-user-id',
        email: 'lecturer@school.edu.vn',
        role: Role.LECTURER,
      };

      const result = await controller.getMyClasses(lecturerUser);

      expect(mockAcademicFacade.getClassesByLecturer).toHaveBeenCalledWith(
        'lec-user-id',
      );
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

    it('returns paginated classes when query parameters are provided', async () => {
      const paginatedResult = {
        items: [sampleClassView],
        total: 1,
        page: 1,
        limit: 6,
        totalPages: 1,
      };
      mockClassService.findMyClasses!.mockResolvedValue(paginatedResult);
      const studentUser: AuthenticatedUser = {
        id: 'stu-user-id',
        email: 'student@school.edu.vn',
        role: Role.STUDENT,
      };

      const result = await controller.getMyClasses(studentUser, {
        page: 1,
        limit: 6,
        status: 'in_progress',
      });

      expect(mockClassService.findMyClasses).toHaveBeenCalledWith(
        'stu-user-id',
        Role.STUDENT,
        { page: 1, limit: 6, status: 'in_progress' },
      );
      expect(result).toEqual(paginatedResult);
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

      const result = await controller.update('cls-uuid-1', {
        name: 'New Name',
      });

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
  describe('importClasses', () => {
    it('delegates the rows to ClassImportService and returns its result', async () => {
      const dto = { rows: [{ line: 2, classCode: 'WEB26.01' }], dryRun: true };
      const result = { dryRun: true, total: 1, created: 1, skipped: 0, failed: 0, rows: [] };
      mockImportService.importClasses.mockResolvedValue(result);

      await expect(controller.importClasses(dto)).resolves.toBe(result);
      expect(mockImportService.importClasses).toHaveBeenCalledWith(dto);
    });
  });
  describe('class list export', () => {
    const makeResponse = () => ({ set: vi.fn(), end: vi.fn() }) as unknown as Response;

    it('sends the lecturer class list as a download', async () => {
      const response = makeResponse();

      await controller.exportLecturerClasses('lec-uuid', response);

      expect(mockExportService.exportLecturerClasses).toHaveBeenCalledWith('lec-uuid');
      expect(response.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition': "attachment; filename*=UTF-8''Classes.xlsx",
        }),
      );
      expect(response.end).toHaveBeenCalledWith(Buffer.from('xlsx'));
    });

    it('sends the student class list as a download', async () => {
      const response = makeResponse();

      await controller.exportStudentClasses('stu-uuid', response);

      expect(mockExportService.exportStudentClasses).toHaveBeenCalledWith('stu-uuid');
      expect(response.end).toHaveBeenCalledWith(Buffer.from('xlsx'));
    });

    it('returns lecturer class list as JSON for admin modal', async () => {
      const rows = [{ id: 'c1', classCode: 'WEB26.01' }];
      mockExportService.getLecturerClasses.mockResolvedValue(rows);

      await expect(controller.getLecturerClasses('lec-uuid')).resolves.toBe(rows);
      expect(mockExportService.getLecturerClasses).toHaveBeenCalledWith('lec-uuid');
    });

    it('returns student class list as JSON for admin modal', async () => {
      const rows = [{ id: 'c1', classCode: 'WEB26.01' }];
      mockExportService.getStudentClasses.mockResolvedValue(rows);

      await expect(controller.getStudentClasses('stu-uuid')).resolves.toBe(rows);
      expect(mockExportService.getStudentClasses).toHaveBeenCalledWith('stu-uuid');
    });
  });
  describe('importClassData', () => {
    it('delegates the files to ClassDataImportService and returns its result', async () => {
      const dto = { files: [], dryRun: true };
      const result = { dryRun: true, files: [] };
      mockDataImportService.importData.mockResolvedValue(result);

      await expect(controller.importClassData(dto as never)).resolves.toBe(result);
      expect(mockDataImportService.importData).toHaveBeenCalledWith(dto);
    });
  });
});