import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  buildClassListWorkbook,
  type ClassListExportRow,
} from './class-list-export.builder.js';

const row = (overrides: Partial<ClassListExportRow> = {}): ClassListExportRow => ({
  classCode: 'WEB26.01',
  name: 'Web development',
  subjectCode: 'IT001',
  subjectName: 'Web programming',
  semesterCode: '2026-1',
  semesterName: 'Semester 1 2026',
  lecturerName: 'Tran Van B',
  studentCount: 40,
  isActive: true,
  endedAt: null,
  joinedAt: null,
  ...overrides,
});

const read = async (buffer: Buffer): Promise<ExcelJS.Worksheet | undefined> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(buffer).buffer);
  return workbook.getWorksheet('Classes');
};

describe('buildClassListWorkbook', () => {
  it('writes a lecturer list without the lecturer and joined-at columns', async () => {
    const sheet = await read(
      await buildClassListWorkbook('LECTURER', [
        row(),
        // 03:00 UTC is 10:00 in Vietnam.
        row({ classCode: 'WEB25.01', isActive: false, endedAt: new Date('2026-01-10T03:00:00Z') }),
      ]),
    );

    expect(sheet?.getRow(1).values).toEqual([
      undefined,
      'Class Code',
      'Class Name',
      'Subject Code',
      'Subject Name',
      'Semester Code',
      'Semester Name',
      'Students',
      'Status',
      'Ended At',
    ]);
    expect(sheet?.rowCount).toBe(3);
    expect(sheet?.getRow(2).getCell(7).value).toBe(40);
    expect(sheet?.getRow(2).getCell(8).value).toBe('ACTIVE');
    expect(sheet?.getRow(2).getCell(9).value).toBe('');
    expect(sheet?.getRow(3).getCell(8).value).toBe('ENDED');
    expect(sheet?.getRow(3).getCell(9).value).toBe('10/01/2026 10:00');
  });

  it('adds who teaches each class and when the student joined it to a student list', async () => {
    const sheet = await read(
      await buildClassListWorkbook('STUDENT', [
        row({ joinedAt: new Date('2026-09-01T01:30:00Z') }),
      ]),
    );

    expect(sheet?.getRow(1).getCell(7).value).toBe('Lecturer');
    expect(sheet?.getRow(1).getCell(11).value).toBe('Joined At');
    expect(sheet?.getRow(2).getCell(7).value).toBe('Tran Van B');
    expect(sheet?.getRow(2).getCell(8).value).toBe(40);
    expect(sheet?.getRow(2).getCell(11).value).toBe('01/09/2026 08:30');
  });

  it('still writes the header row when there are no classes', async () => {
    const sheet = await read(await buildClassListWorkbook('LECTURER', []));
    expect(sheet?.rowCount).toBe(1);
  });
});