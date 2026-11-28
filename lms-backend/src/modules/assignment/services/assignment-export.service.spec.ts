import { NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { AcademicFacade } from '../../academic/facades/academic.facade.js';
import type { ContentFacade } from '../../content/facades/content.facade.js';
import { SubmissionType } from '../enums/submission-type.enum.js';
import type { AssignmentRepository } from '../repositories/assignment.repository.js';
import type { SubmissionRepository } from '../repositories/submission.repository.js';
import { AssignmentExportService } from './assignment-export.service.js';

type Mock = ReturnType<typeof vi.fn>;

const CLASS_ID = 'class-1';
const ASSIGNMENT_ID = 'assign-1';
const lecturer = { id: 'lec-1', role: Role.LECTURER } as unknown as AuthenticatedUser;

const assignment = {
  id: ASSIGNMENT_ID,
  title: 'Lab 1: Intro/Setup',
  instruction: 'Do the work',
  openAt: new Date('2026-11-01T01:00:00Z'),
  endAt: new Date('2026-11-10T16:59:00Z'),
  submissionType: SubmissionType.FILE,
  acceptedExtensions: ['py'],
  submissionNote: null,
};

const submission = (studentId: string, code: string, score: number | null) => ({
  id: `sub-${studentId}`,
  assignmentId: ASSIGNMENT_ID,
  submittedBy: studentId,
  score,
  comment: null,
  submittedAt: new Date('2026-11-09T01:00:00Z'),
  gradedAt: score === null ? null : new Date('2026-11-11T01:00:00Z'),
  student: { studentCode: code, user: { fullName: `Name ${code}`, email: `${code}@x.edu` } },
});

describe('AssignmentExportService', () => {
  let service: AssignmentExportService;
  let assignmentRepository: Record<'findById', Mock>;
  let submissionRepository: Record<'findAllByAssignment' | 'findFileIdsBySubmissions', Mock>;
  let academicFacade: Record<'assertCanManageClass' | 'getClassById' | 'getClassRoster', Mock>;
  let contentFacade: Record<'isAssignmentInClass', Mock>;

  beforeEach(() => {
    assignmentRepository = { findById: vi.fn().mockResolvedValue(assignment) };
    submissionRepository = {
      findAllByAssignment: vi.fn().mockResolvedValue([
        // Score comes back from Postgres as a string.
        submission('u-1', 'SV001', '8.50' as unknown as number),
        submission('u-gone', 'SV999', null),
      ]),
      findFileIdsBySubmissions: vi.fn().mockResolvedValue(new Map([['sub-u-1', ['f1', 'f2']]])),
    };
    academicFacade = {
      assertCanManageClass: vi.fn().mockResolvedValue(undefined),
      getClassById: vi.fn().mockResolvedValue({ classCode: 'IT001.01', name: 'Lập trình' }),
      getClassRoster: vi.fn().mockResolvedValue([
        { id: 'u-2', studentCode: 'SV002', fullName: 'Name SV002', email: 'sv002@x.edu' },
        { id: 'u-1', studentCode: 'SV001', fullName: 'Name SV001', email: 'sv001@x.edu' },
      ]),
    };
    contentFacade = { isAssignmentInClass: vi.fn().mockResolvedValue(true) };
    service = new AssignmentExportService(
      assignmentRepository as unknown as AssignmentRepository,
      submissionRepository as unknown as SubmissionRepository,
      academicFacade as unknown as AcademicFacade,
      contentFacade as unknown as ContentFacade,
    );
  });

  it('exports every enrolled student sorted by code, then submissions of former students', async () => {
    const file = await service.exportResults(CLASS_ID, ASSIGNMENT_ID, lecturer);

    expect(academicFacade.assertCanManageClass).toHaveBeenCalledWith(CLASS_ID, lecturer);
    expect(file.fileName).toBe('Ket-qua-IT001.01-Lab 1_ Intro_Setup.xlsx');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(new Uint8Array(file.buffer).buffer);
    const sheet = workbook.getWorksheet('Results');
    expect(sheet?.rowCount).toBe(4);
    expect(sheet?.getRow(2).getCell(1).value).toBe('SV001');
    expect(sheet?.getRow(2).getCell(4).value).toBe('GRADED');
    expect(sheet?.getRow(2).getCell(7).value).toBe(2);
    expect(sheet?.getRow(2).getCell(8).value).toBe(8.5);
    expect(sheet?.getRow(3).getCell(1).value).toBe('SV002');
    expect(sheet?.getRow(3).getCell(4).value).toBe('NOT_SUBMITTED');
    expect(sheet?.getRow(4).getCell(1).value).toBe('SV999');
    expect(String(sheet?.getRow(4).getCell(2).value)).toContain('không còn trong lớp');
  });

  it('refuses an assignment that is not part of the class', async () => {
    contentFacade.isAssignmentInClass.mockResolvedValue(false);
    await expect(service.exportResults(CLASS_ID, ASSIGNMENT_ID, lecturer)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(submissionRepository.findAllByAssignment).not.toHaveBeenCalled();
  });

  it('does not export when the user cannot manage the class', async () => {
    academicFacade.assertCanManageClass.mockRejectedValue(new Error('forbidden'));
    await expect(service.exportResults(CLASS_ID, ASSIGNMENT_ID, lecturer)).rejects.toThrow('forbidden');
    expect(assignmentRepository.findById).not.toHaveBeenCalled();
  });
});