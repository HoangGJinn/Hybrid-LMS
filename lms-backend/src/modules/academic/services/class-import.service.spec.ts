import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserFacade } from '../../user/facades/user.facade.js';
import type { LecturerSummary } from '../../user/types/lecturer-summary.type.js';
import type { ClassRepository } from '../repositories/class.repository.js';
import type { SemesterRepository } from '../repositories/semester.repository.js';
import type { SubjectRepository } from '../repositories/subject.repository.js';
import { ClassImportService } from './class-import.service.js';

type Mock = ReturnType<typeof vi.fn>;

const lecturer = (overrides: Partial<LecturerSummary> = {}): LecturerSummary => ({
  userId: 'lec-1',
  lecturerCode: 'GV26000001',
  fullName: 'Tran Van B',
  email: 'b@school.edu.vn',
  assignmentBlockedReason: null,
  ...overrides,
});

const row = (line: number, overrides: Record<string, string | undefined> = {}) => ({
  line,
  classCode: `WEB26.0${line}`,
  name: 'Web development',
  subjectCode: 'IT001',
  semesterCode: '2026-1',
  lecturer: 'GV26000001',
  ...overrides,
});

describe('ClassImportService', () => {
  let service: ClassImportService;
  let classRepo: Record<'findExistingCodes' | 'createMany', Mock>;
  let subjectRepo: Record<'findAll', Mock>;
  let semesterRepo: Record<'findAll', Mock>;
  let userFacade: Record<'findLecturersByCodes' | 'findLecturersByEmails', Mock>;

  beforeEach(() => {
    classRepo = {
      findExistingCodes: vi.fn().mockResolvedValue(new Set<string>()),
      createMany: vi.fn().mockResolvedValue(undefined),
    };
    subjectRepo = { findAll: vi.fn().mockResolvedValue([{ id: 'sub-1', subjectCode: 'IT001' }]) };
    semesterRepo = { findAll: vi.fn().mockResolvedValue([{ id: 'sem-1', semesterCode: '2026-1' }]) };
    userFacade = {
      findLecturersByCodes: vi.fn().mockResolvedValue([lecturer()]),
      findLecturersByEmails: vi.fn().mockResolvedValue([lecturer()]),
    };
    service = new ClassImportService(
      classRepo as unknown as ClassRepository,
      subjectRepo as unknown as SubjectRepository,
      semesterRepo as unknown as SemesterRepository,
      userFacade as unknown as UserFacade,
    );
  });

  it('creates valid rows and maps codes to ids', async () => {
    const result = await service.importClasses({ rows: [row(2), row(3)] });

    expect(result).toMatchObject({ dryRun: false, total: 2, created: 2, skipped: 0, failed: 0 });
    expect(classRepo.createMany).toHaveBeenCalledWith([
      {
        classCode: 'WEB26.02',
        name: 'Web development',
        subjectId: 'sub-1',
        semesterId: 'sem-1',
        lecturerId: 'lec-1',
      },
      expect.objectContaining({ classCode: 'WEB26.03' }),
    ]);
  });

  it('writes nothing on a dry run but reports the same outcome', async () => {
    const result = await service.importClasses({ rows: [row(2)], dryRun: true });

    expect(result).toMatchObject({ dryRun: true, created: 1 });
    expect(result.rows[0]).toMatchObject({ line: 2, status: 'created', message: null });
    expect(classRepo.createMany).not.toHaveBeenCalled();
  });

  it('skips a class whose code already exists, ignoring case', async () => {
    classRepo.findExistingCodes.mockResolvedValue(new Set(['web26.02']));

    const result = await service.importClasses({
      rows: [row(2, { classCode: 'WEB26.02' }), row(3)],
    });

    expect(result.rows[0]).toMatchObject({
      status: 'skipped',
      message: 'Class code WEB26.02 already exists',
    });
    expect(result).toMatchObject({ created: 1, skipped: 1 });
    expect(classRepo.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ classCode: 'WEB26.03' }),
    ]);
    expect(classRepo.findExistingCodes).toHaveBeenCalledWith(['WEB26.02', 'WEB26.03']);
  });

  it('skips the later row when a code repeats in the file, ignoring case', async () => {
    const result = await service.importClasses({
      rows: [row(2, { classCode: 'WEB26' }), row(3, { classCode: 'web26' }), row(4, { classCode: 'WEB26' })],
    });

    expect(result.rows.map((r) => r.status)).toEqual(['created', 'skipped', 'skipped']);
    expect(result.rows[1].message).toBe('Duplicate of row 2 in the file');
    expect(result.rows[2].message).toBe('Duplicate of row 2 in the file');
    expect(classRepo.createMany).toHaveBeenCalledTimes(1);
    expect(classRepo.createMany.mock.calls[0][0]).toHaveLength(1);
  });

  it('does not let an invalid row claim a code that a later valid row uses', async () => {
    const result = await service.importClasses({
      rows: [row(2, { classCode: 'WEB26', subjectCode: 'NOPE' }), row(3, { classCode: 'WEB26' })],
    });

    expect(result.rows.map((r) => r.status)).toEqual(['error', 'created']);
  });

  it.each([
    ['classCode', 'Class code is required'],
    ['name', 'Class name is required'],
    ['subjectCode', 'Subject code is required'],
    ['semesterCode', 'Semester code is required'],
    ['lecturer', 'Lecturer code or email is required'],
  ])('reports a missing %s', async (field, message) => {
    const result = await service.importClasses({ rows: [row(2, { [field]: undefined })] });

    expect(result.rows[0]).toMatchObject({ status: 'error', message });
    expect(classRepo.createMany).not.toHaveBeenCalled();
  });

  it('rejects values over the column limits', async () => {
    const result = await service.importClasses({
      rows: [row(2, { classCode: 'X'.repeat(51) }), row(3, { name: 'N'.repeat(256) })],
    });

    expect(result.rows[0].message).toBe('Class code is longer than 50 characters');
    expect(result.rows[1].message).toBe('Class name is longer than 255 characters');
  });

  it('reports unknown subject, semester and lecturer', async () => {
    userFacade.findLecturersByCodes.mockResolvedValue([]);
    userFacade.findLecturersByEmails.mockResolvedValue([]);

    const result = await service.importClasses({
      rows: [
        row(2, { subjectCode: 'NOPE' }),
        row(3, { semesterCode: 'NOPE' }),
        row(4, { lecturer: 'GV99' }),
        row(5, { lecturer: 'x@school.edu.vn' }),
      ],
    });

    expect(result.rows.map((r) => r.message)).toEqual([
      'No subject with code NOPE',
      'No semester with code NOPE',
      'No lecturer with code GV99',
      'No lecturer with email x@school.edu.vn',
    ]);
    expect(result.failed).toBe(4);
  });

  it('matches subject, semester and lecturer codes ignoring case', async () => {
    const result = await service.importClasses({
      rows: [row(2, { subjectCode: 'it001', semesterCode: '2026-1', lecturer: 'gv26000001' })],
    });

    expect(result.rows[0].status).toBe('created');
    expect(userFacade.findLecturersByCodes).toHaveBeenCalledWith(['GV26000001']);
  });

  it('looks a lecturer up by email when the cell contains an @', async () => {
    const result = await service.importClasses({
      rows: [row(2, { lecturer: 'B@School.edu.vn' })],
    });

    expect(userFacade.findLecturersByEmails).toHaveBeenCalledWith(['b@school.edu.vn']);
    expect(result.rows[0].status).toBe('created');
  });

  it('refuses a lecturer who cannot be given a class', async () => {
    userFacade.findLecturersByCodes.mockResolvedValue([
      lecturer({ assignmentBlockedReason: 'The lecturer account is deactivated' }),
    ]);

    const result = await service.importClasses({ rows: [row(2)] });

    expect(result.rows[0]).toMatchObject({
      status: 'error',
      message: 'The lecturer account is deactivated',
    });
  });

  it('turns a unique violation during the insert into a conflict', async () => {
    classRepo.createMany.mockRejectedValue(
      new QueryFailedError('INSERT', [], Object.assign(new Error('duplicate'), { code: '23505' })),
    );

    await expect(service.importClasses({ rows: [row(2)] })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('does not query lecturers when no row names one', async () => {
    await service.importClasses({ rows: [row(2, { lecturer: undefined })], dryRun: true });

    expect(userFacade.findLecturersByCodes).toHaveBeenCalledWith([]);
    expect(userFacade.findLecturersByEmails).toHaveBeenCalledWith([]);
  });
});