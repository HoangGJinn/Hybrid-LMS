import { BadRequestException, ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserFacade } from '../../user/facades/user.facade.js';
import type { LecturerSummary } from '../../user/types/lecturer-summary.type.js';
import type { StudentSummary } from '../../user/types/student-summary.type.js';
import {
  MAX_IMPORT_STUDENT_ROWS,
  type ImportClassDataDto,
} from '../dto/import-class-data.dto.js';
import type { ClassRepository } from '../repositories/class.repository.js';
import type { SemesterRepository } from '../repositories/semester.repository.js';
import type { SubjectRepository } from '../repositories/subject.repository.js';
import { ClassDataImportService } from './class-data-import.service.js';
import { ClassImportService } from './class-import.service.js';

type Mock = ReturnType<typeof vi.fn>;

const lecturer: LecturerSummary = {
  userId: 'lec-1',
  lecturerCode: 'GV26000001',
  fullName: 'Tran Van B',
  email: 'b@school.edu.vn',
  assignmentBlockedReason: null,
};

const student = (
  n: number,
  overrides: Partial<StudentSummary> = {},
): StudentSummary => ({
  userId: `stu-${n}`,
  studentCode: `SV2600000${n}`,
  fullName: `Student ${n}`,
  email: `sv${n}@school.edu.vn`,
  isActive: true,
  status: 'STUDYING',
  enrollmentBlockedReason: null,
  ...overrides,
});

const classRow = (line: number, classCode: string) => ({
  line,
  classCode,
  name: `Class ${classCode}`,
  subjectCode: 'IT001',
  semesterCode: '2026-1',
  lecturer: 'GV26000001',
});

const file = (
  name: string,
  classes: ReturnType<typeof classRow>[],
  students: {
    line: number;
    classCode?: string;
    studentCode?: string;
    email?: string;
  }[],
) => ({ name, classes, students });

describe('ClassDataImportService', () => {
  let service: ClassDataImportService;
  let classRepo: Record<'findExistingCodes' | 'createWithStudents', Mock>;
  let userFacade: Record<
    | 'findLecturersByCodes'
    | 'findLecturersByEmails'
    | 'findStudentsByCodes'
    | 'findStudentsByEmails',
    Mock
  >;

  beforeEach(() => {
    classRepo = {
      findExistingCodes: vi.fn().mockResolvedValue(new Set<string>()),
      createWithStudents: vi.fn().mockResolvedValue(undefined),
    };
    userFacade = {
      findLecturersByCodes: vi.fn().mockResolvedValue([lecturer]),
      findLecturersByEmails: vi.fn().mockResolvedValue([]),
      findStudentsByCodes: vi.fn().mockResolvedValue([
        student(1),
        student(2),
        student(3, {
          enrollmentBlockedReason: 'The student account is deactivated',
        }),
      ]),
      findStudentsByEmails: vi.fn().mockResolvedValue([student(1), student(2)]),
    };
    const subjectRepo = {
      findAll: vi
        .fn()
        .mockResolvedValue([{ id: 'sub-1', subjectCode: 'IT001' }]),
    };
    const semesterRepo = {
      findAll: vi
        .fn()
        .mockResolvedValue([{ id: 'sem-1', semesterCode: '2026-1' }]),
    };
    const classImport = new ClassImportService(
      classRepo as unknown as ClassRepository,
      subjectRepo as unknown as SubjectRepository,
      semesterRepo as unknown as SemesterRepository,
      userFacade as unknown as UserFacade,
    );
    service = new ClassDataImportService(
      classImport,
      classRepo as unknown as ClassRepository,
      userFacade as unknown as UserFacade,
    );
  });

  it('creates the classes of every file and adds their students in one go', async () => {
    const dto: ImportClassDataDto = {
      files: [
        file(
          'a.xlsx',
          [classRow(2, 'WEB26.01')],
          [
            { line: 2, studentCode: 'SV26000001' },
            { line: 3, studentCode: 'sv26000002' },
          ],
        ),
        file(
          'b.xlsx',
          [classRow(2, 'WEB26.02')],
          [{ line: 2, email: 'SV1@school.edu.vn' }],
        ),
      ],
    };

    const result = await service.importData(dto);

    expect(result).toMatchObject({
      dryRun: false,
      createdClasses: 2,
      addedStudents: 3,
      skippedClasses: 0,
      failedStudents: 0,
    });
    expect(classRepo.createWithStudents).toHaveBeenCalledWith([
      {
        data: {
          classCode: 'WEB26.01',
          name: 'Class WEB26.01',
          subjectId: 'sub-1',
          semesterId: 'sem-1',
          lecturerId: 'lec-1',
        },
        studentIds: ['stu-1', 'stu-2'],
      },
      expect.objectContaining({ studentIds: ['stu-1'] }),
    ]);
    expect(result.files[0].students[0]).toMatchObject({
      line: 2,
      status: 'added',
      classCode: 'WEB26.01',
      studentCode: 'SV26000001',
      fullName: 'Student 1',
    });
  });

  it('writes nothing on a dry run but reports the same outcome', async () => {
    const result = await service.importData({
      files: [
        file(
          'a.xlsx',
          [classRow(2, 'WEB26.01')],
          [{ line: 2, studentCode: 'SV26000001' }],
        ),
      ],
      dryRun: true,
    });

    expect(result).toMatchObject({
      dryRun: true,
      createdClasses: 1,
      addedStudents: 1,
    });
    expect(classRepo.createWithStudents).not.toHaveBeenCalled();
  });

  it('reports the row numbers of the file, not positions in the combined list', async () => {
    const result = await service.importData({
      files: [
        file('a.xlsx', [classRow(5, 'WEB26.01')], []),
        file('b.xlsx', [classRow(9, 'WEB26.02')], []),
      ],
    });

    expect(result.files.map((f) => f.classes[0].line)).toEqual([5, 9]);
  });

  it('lets a file with one class leave the class code out of its student rows', async () => {
    const result = await service.importData({
      files: [
        file(
          'a.xlsx',
          [classRow(2, 'WEB26.01')],
          [{ line: 2, studentCode: 'SV26000001' }],
        ),
      ],
    });

    expect(result.files[0].students[0]).toMatchObject({
      status: 'added',
      classCode: 'WEB26.01',
    });
  });

  it('requires a class code in student rows when the file has several classes', async () => {
    const result = await service.importData({
      files: [
        file(
          'a.xlsx',
          [classRow(2, 'WEB26.01'), classRow(3, 'WEB26.02')],
          [
            { line: 2, studentCode: 'SV26000001' },
            { line: 3, classCode: 'web26.02', studentCode: 'SV26000002' },
          ],
        ),
      ],
    });

    expect(result.files[0].students[0]).toMatchObject({
      status: 'error',
      message:
        'Class code is required because the file has more than one class',
    });
    expect(result.files[0].students[1]).toMatchObject({
      status: 'added',
      classCode: 'web26.02',
    });
  });

  it('skips a class that already exists together with its students', async () => {
    classRepo.findExistingCodes.mockResolvedValue(new Set(['web26.01']));

    const result = await service.importData({
      files: [
        file(
          'a.xlsx',
          [classRow(2, 'WEB26.01')],
          [{ line: 2, studentCode: 'SV26000001' }],
        ),
      ],
    });

    expect(result.files[0].classes[0]).toMatchObject({
      status: 'skipped',
      message: 'Class code WEB26.01 already exists',
    });
    expect(result.files[0].students[0]).toMatchObject({
      status: 'skipped',
      message:
        'Class WEB26.01 is not created: Class code WEB26.01 already exists',
    });
    expect(result).toMatchObject({
      createdClasses: 0,
      skippedClasses: 1,
      addedStudents: 0,
    });
    expect(classRepo.createWithStudents).not.toHaveBeenCalled();
  });

  it('skips a class code repeated in a later file and names the earlier file', async () => {
    const result = await service.importData({
      files: [
        file(
          'a.xlsx',
          [classRow(2, 'WEB26.01')],
          [{ line: 2, studentCode: 'SV26000001' }],
        ),
        file(
          'b.xlsx',
          [classRow(7, 'web26.01')],
          [{ line: 2, studentCode: 'SV26000002' }],
        ),
      ],
    });

    expect(result.files[1].classes[0]).toMatchObject({
      line: 7,
      status: 'skipped',
      message: 'Duplicate of row 2 of a.xlsx',
    });
    expect(result.files[1].students[0]).toMatchObject({
      status: 'skipped',
      message: 'Class web26.01 is not created: Duplicate of row 2 of a.xlsx',
    });
    expect(classRepo.createWithStudents).toHaveBeenCalledWith([
      expect.objectContaining({ studentIds: ['stu-1'] }),
    ]);
  });

  it('adds the students to the row that creates the class when an earlier row with that code failed', async () => {
    const broken = { ...classRow(2, 'WEB26.01'), subjectCode: 'NOPE' };

    const result = await service.importData({
      files: [
        file(
          'a.xlsx',
          [broken, classRow(3, 'WEB26.01')],
          [{ line: 2, classCode: 'WEB26.01', studentCode: 'SV26000001' }],
        ),
      ],
    });

    expect(result.files[0].classes.map((c) => c.status)).toEqual([
      'error',
      'created',
    ]);
    expect(result.files[0].students[0].status).toBe('added');
  });

  it('reports students that cannot be added without affecting the others', async () => {
    const result = await service.importData({
      files: [
        file(
          'a.xlsx',
          [classRow(2, 'WEB26.01')],
          [
            { line: 2, studentCode: 'SV26000001' },
            { line: 3, studentCode: 'SV26000001' },
            { line: 4, studentCode: 'SV26000009' },
            { line: 5, studentCode: 'SV26000003' },
            { line: 6, studentCode: 'SV26000001', email: 'sv2@school.edu.vn' },
            { line: 7 },
            { line: 8, classCode: 'NOPE', studentCode: 'SV26000002' },
          ],
        ),
      ],
    });

    expect(result.files[0].students.map((s) => [s.status, s.message])).toEqual([
      ['added', null],
      ['skipped', 'Duplicate of an earlier row for this class'],
      ['error', 'No student with code SV26000009'],
      ['error', 'The student account is deactivated'],
      ['error', 'The student code and the email belong to different students'],
      ['error', 'Provide a student code or an email'],
      ['error', 'Class NOPE is not in the imported files'],
    ]);
    expect(result).toMatchObject({
      addedStudents: 1,
      skippedStudents: 1,
      failedStudents: 5,
    });
  });

  it('creates the class even when none of its students can be added', async () => {
    await service.importData({
      files: [
        file(
          'a.xlsx',
          [classRow(2, 'WEB26.01')],
          [{ line: 2, studentCode: 'SV26000009' }],
        ),
      ],
    });

    expect(classRepo.createWithStudents).toHaveBeenCalledWith([
      expect.objectContaining({ studentIds: [] }),
    ]);
  });

  it('does not write when every class is skipped or invalid', async () => {
    const result = await service.importData({
      files: [file('a.xlsx', [{ ...classRow(2, 'WEB26.01'), name: '' }], [])],
    });

    expect(result.failedClasses).toBe(1);
    expect(classRepo.createWithStudents).not.toHaveBeenCalled();
  });

  it('rejects more student rows than the limit', async () => {
    const students = Array.from(
      { length: MAX_IMPORT_STUDENT_ROWS + 1 },
      (_, i) => ({
        line: i + 2,
        studentCode: 'SV26000001',
      }),
    );

    await expect(
      service.importData({
        files: [file('a.xlsx', [classRow(2, 'WEB26.01')], students)],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(classRepo.createWithStudents).not.toHaveBeenCalled();
  });

  it('turns a unique violation during the insert into a conflict', async () => {
    classRepo.createWithStudents.mockRejectedValue(
      new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('duplicate'), { code: '23505' }),
      ),
    );

    await expect(
      service.importData({
        files: [file('a.xlsx', [classRow(2, 'WEB26.01')], [])],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('lets a student row name a class defined in another file when its own file does not define it', async () => {
    const result = await service.importData({
      files: [
        file('a.xlsx', [classRow(2, 'WEB26.01')], []),
        file(
          'b.xlsx',
          [classRow(2, 'WEB26.02'), classRow(3, 'WEB26.03')],
          [{ line: 2, classCode: 'WEB26.01', studentCode: 'SV26000001' }],
        ),
      ],
    });

    expect(result.files[1].students[0].status).toBe('added');
    expect(classRepo.createWithStudents).toHaveBeenCalledWith([
      expect.objectContaining({ studentIds: ['stu-1'] }),
      expect.objectContaining({ studentIds: [] }),
      expect.objectContaining({ studentIds: [] }),
    ]);
  });
});