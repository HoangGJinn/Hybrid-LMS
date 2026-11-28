import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  buildAssignmentWorkbook,
  type AssignmentExportRow,
} from './assignment-export.builder.js';

const row = (overrides: Partial<AssignmentExportRow>): AssignmentExportRow => ({
  studentCode: 'SV001',
  fullName: 'Nguyen Van A',
  email: 'a@example.com',
  status: 'NOT_SUBMITTED',
  submittedAt: null,
  isLate: false,
  fileCount: 0,
  score: null,
  comment: null,
  gradedAt: null,
  ...overrides,
});

const read = async (buffer: Buffer): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(buffer).buffer);
  return workbook;
};

describe('buildAssignmentWorkbook', () => {
  it('writes a single sheet with one row per student', async () => {
    const workbook = await read(
      await buildAssignmentWorkbook([
        row({
          studentCode: 'SV001',
          status: 'GRADED',
          // 01:00 UTC is 08:00 in Vietnam.
          submittedAt: new Date('2026-11-09T01:00:00Z'),
          fileCount: 2,
          score: 8,
          comment: 'Tốt',
          gradedAt: new Date('2026-11-11T01:00:00Z'),
        }),
        row({
          studentCode: 'SV002',
          status: 'SUBMITTED',
          submittedAt: new Date('2026-11-11T01:00:00Z'),
          isLate: true,
          fileCount: 1,
        }),
        row({ studentCode: 'SV003' }),
      ]),
    );

    expect(workbook.worksheets).toHaveLength(1);
    const sheet = workbook.getWorksheet('Results');
    expect(sheet?.rowCount).toBe(4);
    expect(sheet?.getRow(1).getCell(1).value).toBe('Student Code');
    expect(sheet?.getRow(1).getCell(8).value).toBe('Score (/10)');

    expect(sheet?.getRow(2).getCell(1).value).toBe('SV001');
    expect(sheet?.getRow(2).getCell(4).value).toBe('GRADED');
    expect(sheet?.getRow(2).getCell(5).value).toBe('09/11/2026 08:00');
    expect(sheet?.getRow(2).getCell(6).value).toBe('No');
    expect(sheet?.getRow(2).getCell(7).value).toBe(2);
    expect(sheet?.getRow(2).getCell(8).value).toBe(8);
    expect(sheet?.getRow(2).getCell(10).value).toBe('Tốt');

    expect(sheet?.getRow(3).getCell(4).value).toBe('SUBMITTED');
    expect(sheet?.getRow(3).getCell(6).value).toBe('Yes');
    expect(sheet?.getRow(3).getCell(8).value).toBeNull();

    expect(sheet?.getRow(4).getCell(4).value).toBe('NOT_SUBMITTED');
    expect(sheet?.getRow(4).getCell(6).value).toBe('');
    expect(sheet?.getRow(4).getCell(7).value).toBe('');
  });

  it('still writes the header row when the class has no students', async () => {
    const workbook = await read(await buildAssignmentWorkbook([]));
    expect(workbook.getWorksheet('Results')?.rowCount).toBe(1);
  });
});