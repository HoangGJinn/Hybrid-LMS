import { NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserFacade } from '../../user/facades/user.facade.js';
import type { ClassRepository } from '../repositories/class.repository.js';
import { ClassExportService } from './class-export.service.js';

type Mock = ReturnType<typeof vi.fn>;

const LECTURER_ID = '11111111-1111-4111-8111-111111111111';
const STUDENT_ID = '22222222-2222-4222-8222-222222222222';

const cls = (id: string, classCode: string, isActive = true) => ({
  id,
  classCode,
  name: `Class ${classCode}`,
  isActive,
  endedAt: isActive ? null : new Date('2026-01-10T03:00:00Z'),
  subject: { subjectCode: 'IT001', name: 'Web programming' },
  semester: { semesterCode: '2026-1', name: 'Semester 1 2026' },
  lecturer: { user: { fullName: 'Tran Van B' } },
});

const load = async (buffer: Buffer): Promise<ExcelJS.Worksheet | undefined> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(buffer).buffer);
  return workbook.getWorksheet('Classes');
};

describe('ClassExportService', () => {
  let service: ClassExportService;
  let classRepo: Record<
    'findAllByLecturerId' | 'findEnrollmentsByStudentId' | 'countStudentsBatch',
    Mock
  >;
  let userFacade: Record<'findLecturersByIds' | 'findStudentsByIds', Mock>;

  beforeEach(() => {
    classRepo = {
      findAllByLecturerId: vi
        .fn()
        .mockResolvedValue([cls('c1', 'WEB26.01'), cls('c2', 'WEB25.01', false)]),
      findEnrollmentsByStudentId: vi.fn().mockResolvedValue([
        {
          classId: 'c1',
          class: cls('c1', 'WEB26.01'),
          joinedAt: new Date('2026-09-01T01:30:00Z'),
        },
      ]),
      countStudentsBatch: vi.fn().mockResolvedValue(new Map([['c1', 40]])),
    };
    userFacade = {
      findLecturersByIds: vi.fn().mockResolvedValue([{ lecturerCode: 'GV26000001' }]),
      findStudentsByIds: vi.fn().mockResolvedValue([{ studentCode: 'SV26000001' }]),
    };
    service = new ClassExportService(
      classRepo as unknown as ClassRepository,
      userFacade as unknown as UserFacade,
    );
  });

  it('exports every class of a lecturer, ended ones included, named after the lecturer code', async () => {
    const file = await service.exportLecturerClasses(LECTURER_ID);

    expect(file.fileName).toBe('Classes-taught-GV26000001.xlsx');
    expect(classRepo.countStudentsBatch).toHaveBeenCalledWith(['c1', 'c2']);
    const sheet = await load(file.buffer);
    expect(sheet?.rowCount).toBe(3);
    expect(sheet?.getRow(2).getCell(1).value).toBe('WEB26.01');
    expect(sheet?.getRow(2).getCell(7).value).toBe(40);
    // A class without enrolments counts 0.
    expect(sheet?.getRow(3).getCell(7).value).toBe(0);
    expect(sheet?.getRow(3).getCell(8).value).toBe('ENDED');
  });

  it('exports the classes a student is enrolled in with the lecturer and the join date', async () => {
    const file = await service.exportStudentClasses(STUDENT_ID);

    expect(file.fileName).toBe('Classes-enrolled-SV26000001.xlsx');
    expect(classRepo.findEnrollmentsByStudentId).toHaveBeenCalledWith(STUDENT_ID);
    const sheet = await load(file.buffer);
    expect(sheet?.getRow(2).getCell(7).value).toBe('Tran Van B');
    expect(sheet?.getRow(2).getCell(11).value).toBe('01/09/2026 08:30');
  });

  it('returns only the header for a lecturer without classes', async () => {
    classRepo.findAllByLecturerId.mockResolvedValue([]);
    classRepo.countStudentsBatch.mockResolvedValue(new Map());

    const sheet = await load((await service.exportLecturerClasses(LECTURER_ID)).buffer);

    expect(sheet?.rowCount).toBe(1);
  });

  it('rejects an id that is not a lecturer or a student', async () => {
    userFacade.findLecturersByIds.mockResolvedValue([]);
    userFacade.findStudentsByIds.mockResolvedValue([]);

    await expect(service.exportLecturerClasses(LECTURER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.exportStudentClasses(STUDENT_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(classRepo.findAllByLecturerId).not.toHaveBeenCalled();
    expect(classRepo.findEnrollmentsByStudentId).not.toHaveBeenCalled();
  });

  it('returns JSON class rows with class id for lecturer and student views', async () => {
    const lecturerRows = await service.getLecturerClasses(LECTURER_ID);
    const studentRows = await service.getStudentClasses(STUDENT_ID);

    expect(lecturerRows).toHaveLength(2);
    expect(lecturerRows[0]).toMatchObject({ id: 'c1', classCode: 'WEB26.01', studentCount: 40 });
    expect(studentRows).toHaveLength(1);
    expect(studentRows[0]).toMatchObject({
      id: 'c1',
      classCode: 'WEB26.01',
      lecturerName: 'Tran Van B',
    });
  });
});