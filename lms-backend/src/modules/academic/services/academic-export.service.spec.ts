import { BadRequestException, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditFacade } from '../../../shared/audit/index.js';
import { AuditAction } from '../../../shared/audit/index.js';
import type { UserFacade } from '../../user/facades/user.facade.js';
import type { ClassRepository } from '../repositories/class.repository.js';
import type { SemesterRepository } from '../repositories/semester.repository.js';
import type { SubjectRepository } from '../repositories/subject.repository.js';
import { AcademicExportService, MAX_EXPORT_CLASSES } from './academic-export.service.js';

type Mock = ReturnType<typeof vi.fn>;

const SEMESTER_ID = '11111111-1111-4111-8111-111111111111';

const load = async (buffer: Buffer): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(buffer).buffer);
  return workbook;
};
const rowsOf = (sheet: ExcelJS.Worksheet): string[][] => {
  const rows: string[][] = [];
  sheet.eachRow((r) => rows.push((r.values as unknown[]).slice(1).map((v) => String(v ?? ''))));
  return rows;
};

const cls = (id: string, classCode: string, isActive = true) => ({
  id,
  classCode,
  name: `Class ${classCode}`,
  isActive,
  subject: { subjectCode: 'IT001', name: 'Web programming' },
  semester: { semesterCode: '2026-1', name: 'Semester 1' },
  lecturer: { lecturerCode: 'GV26000001', user: { fullName: 'Tran Van B' } },
});
const enrollment = (classId: string, studentCode: string) => ({
  classId,
  student: {
    studentCode,
    user: { email: `${studentCode.toLowerCase()}@school.edu.vn`, fullName: `Student ${studentCode}` },
  },
});

describe('AcademicExportService', () => {
  let service: AcademicExportService;
  let classRepo: Record<'countForExport' | 'findForExport' | 'findEnrollmentsByClassIds', Mock>;
  let subjectRepo: Record<'findAll', Mock>;
  let semesterRepo: Record<'findAll' | 'findById', Mock>;
  let userFacade: Record<'findAllLecturers', Mock>;
  let audit: { record: Mock };

  beforeEach(() => {
    classRepo = {
      countForExport: vi.fn().mockResolvedValue(2),
      findForExport: vi.fn().mockResolvedValue([cls('c1', 'WEB26.01'), cls('c2', 'WEB26.02', false)]),
      findEnrollmentsByClassIds: vi
        .fn()
        .mockResolvedValue([enrollment('c2', 'SV003'), enrollment('c1', 'SV002'), enrollment('c1', 'SV001')]),
    };
    subjectRepo = { findAll: vi.fn().mockResolvedValue([]) };
    semesterRepo = {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue({ id: SEMESTER_ID, semesterCode: '2026-1' }),
    };
    userFacade = { findAllLecturers: vi.fn().mockResolvedValue([]) };
    audit = { record: vi.fn().mockResolvedValue(undefined) };
    service = new AcademicExportService(
      classRepo as unknown as ClassRepository,
      subjectRepo as unknown as SubjectRepository,
      semesterRepo as unknown as SemesterRepository,
      userFacade as unknown as UserFacade,
      audit as unknown as AuditFacade,
    );
  });

  describe('exportClassRosters', () => {
    it('writes the import layout first, then the read-only columns', async () => {
      const file = await service.exportClassRosters({ status: 'all' });
      const workbook = await load(file.buffer);
      const classes = rowsOf(workbook.getWorksheet('Classes')!);
      expect(classes[0].slice(0, 5)).toEqual([
        'Class Code',
        'Class Name',
        'Subject Code',
        'Semester Code',
        'Lecturer Code/Email',
      ]);
      expect(classes[0].slice(5)).toEqual([
        'Subject Name',
        'Semester Name',
        'Lecturer Name',
        'Students',
        'Status',
      ]);
      expect(classes[1]).toEqual([
        'WEB26.01', 'Class WEB26.01', 'IT001', '2026-1', 'GV26000001',
        'Web programming', 'Semester 1', 'Tran Van B', '2', 'ACTIVE',
      ]);
      expect(classes[2][9]).toBe('ENDED');

      const students = rowsOf(workbook.getWorksheet('Students')!);
      expect(students[0]).toEqual(['Class Code', 'Student Code', 'Email', 'Full Name']);
      // Sorted by class, then student code.
      expect(students.slice(1).map((r) => r.slice(0, 2).join(' '))).toEqual([
        'WEB26.01 SV001',
        'WEB26.01 SV002',
        'WEB26.02 SV003',
      ]);
    });

    it('is a zip-free single xlsx file', async () => {
      const file = await service.exportClassRosters({ semesterId: SEMESTER_ID, status: 'active' });
      expect(file.fileName).toBe('Class-rosters-2026-1-active.xlsx');
    });

    it.each([
      ['active', true],
      ['ended', false],
      ['all', undefined],
    ] as const)('maps status %s to the class filter', async (status, isActive) => {
      await service.exportClassRosters({ semesterId: SEMESTER_ID, status });
      expect(classRepo.countForExport).toHaveBeenCalledWith({ semesterId: SEMESTER_ID, isActive });
    });

    it('defaults to all statuses', async () => {
      await service.exportClassRosters({});
      expect(classRepo.countForExport).toHaveBeenCalledWith({ semesterId: undefined, isActive: undefined });
    });

    it('asks to choose a semester when more than the limit match across all semesters', async () => {
      classRepo.countForExport.mockResolvedValue(MAX_EXPORT_CLASSES + 1);
      const error = await service.exportClassRosters({}).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toContain('Choose a semester');
      expect(classRepo.findForExport).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('exports exactly the limit', async () => {
      classRepo.countForExport.mockResolvedValue(MAX_EXPORT_CLASSES);
      await expect(service.exportClassRosters({})).resolves.toBeDefined();
      expect(classRepo.findForExport).toHaveBeenCalledWith(expect.anything(), MAX_EXPORT_CLASSES);
    });

    it('does not tell the admin to choose a semester when one is already chosen', async () => {
      classRepo.countForExport.mockResolvedValue(MAX_EXPORT_CLASSES + 1);
      const error = await service
        .exportClassRosters({ semesterId: SEMESTER_ID })
        .catch((e: unknown) => e);
      expect((error as BadRequestException).message).not.toContain('Choose a semester');
    });

    it('rejects an unknown semester', async () => {
      semesterRepo.findById.mockResolvedValue(null);
      await expect(service.exportClassRosters({ semesterId: SEMESTER_ID })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('audits the export with its scope and counts', async () => {
      await service.exportClassRosters({ semesterId: SEMESTER_ID, status: 'ended' });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.CLASS_ROSTERS_EXPORTED,
          metadata: {
            semesterId: SEMESTER_ID,
            semesterCode: '2026-1',
            status: 'ended',
            classes: 2,
            studentRows: 3,
          },
        }),
      );
    });
  });

  describe('exportReferenceCodes', () => {
    beforeEach(() => {
      subjectRepo.findAll.mockResolvedValue([
        { subjectCode: 'IT001', name: 'Web programming', description: null },
      ]);
      semesterRepo.findAll.mockResolvedValue([
        {
          semesterCode: '2026-1',
          name: 'Semester 1',
          // 00:00 on 1 Sep to 23:59 on 31 Dec, Vietnam time.
          startDate: new Date('2026-08-31T17:00:00.000Z'),
          endDate: new Date('2026-12-31T16:59:59.999Z'),
        },
      ]);
      userFacade.findAllLecturers.mockResolvedValue([
        { lecturerCode: 'GV1', fullName: 'A', email: 'a@x.vn', assignmentBlockedReason: null },
        {
          lecturerCode: 'GV2',
          fullName: 'B',
          email: 'b@x.vn',
          assignmentBlockedReason: 'The lecturer account is deactivated',
        },
      ]);
    });

    it('has the three sheets', async () => {
      const file = await service.exportReferenceCodes();
      const workbook = await load(file.buffer);
      expect(workbook.worksheets.map((s) => s.name)).toEqual(['Subjects', 'Semesters', 'Lecturers']);
      expect(file.fileName).toBe('Reference-codes.xlsx');
    });

    it('shows semester dates as Vietnam-time days', async () => {
      const workbook = await load((await service.exportReferenceCodes()).buffer);
      expect(rowsOf(workbook.getWorksheet('Semesters')!)).toEqual([
        ['Semester Code', 'Semester Name', 'Start Date', 'End Date'],
        ['2026-1', 'Semester 1', '01/09/2026', '31/12/2026'],
      ]);
    });

    it('says whether each lecturer can be given a class, or why not', async () => {
      const workbook = await load((await service.exportReferenceCodes()).buffer);
      expect(rowsOf(workbook.getWorksheet('Lecturers')!)).toEqual([
        ['Lecturer Code', 'Full Name', 'Email', 'Availability'],
        ['GV1', 'A', 'a@x.vn', 'Available'],
        ['GV2', 'B', 'b@x.vn', 'The lecturer account is deactivated'],
      ]);
    });

    it('audits the export', async () => {
      await service.exportReferenceCodes();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.REFERENCE_CODES_EXPORTED,
          metadata: { subjects: 1, semesters: 1, lecturers: 2 },
        }),
      );
    });
  });
});
