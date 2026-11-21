import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import type { GradeColumnView, GradeRowView } from '../types/gradebook.types.js';
import { buildGradebookWorkbook } from './gradebook-export.builder.js';

const columns: GradeColumnView[] = [
  { id: 'a1', label: 'BT1', title: 'Lab 1', kind: 'assignment', sectionId: 's1', sectionName: 'Chương 1' },
  { id: 'e1', label: 'KT1', title: 'Quiz 1', kind: 'quiz', sectionId: 's1', sectionName: 'Chương 1' },
  { id: 'a2', label: 'BT2', title: 'Lab 2', kind: 'assignment', sectionId: 's2', sectionName: 'Chương 2' },
];

const rows: GradeRowView[] = [
  {
    studentId: 'u1',
    studentCode: 'SV001',
    fullName: 'Nguyen Van A',
    scores: { a1: 8, e1: 4, a2: null },
    processAvg: 8,
    testAvg: 4,
  },
  {
    studentId: 'u2',
    studentCode: 'SV002',
    fullName: 'Tran Thi B',
    scores: { a1: 6, e1: null, a2: null },
    processAvg: 6,
    testAvg: null,
  },
];

describe('buildGradebookWorkbook', () => {
  it('lays out headers, one row per student and a class average row', async () => {
    const buffer = await buildGradebookWorkbook({
      classCode: 'IT001.01',
      exportedAt: new Date('2026-11-20T03:00:00Z'),
      columns,
      rows,
      summary: {
        studentCount: 2,
        processAvg: 7,
        testAvg: 4,
        belowThresholdCount: 1,
        threshold: 5,
      },
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(new Uint8Array(buffer).buffer);
    const sheet = workbook.getWorksheet('Bảng điểm');

    expect(sheet?.getCell(1, 1).value).toBe('BẢNG ĐIỂM LỚP IT001.01');
    // Section header is merged over BT1 + KT1, then a separate one for BT2.
    expect(sheet?.getCell(4, 4).value).toBe('Chương 1');
    expect(sheet?.getCell(4, 6).value).toBe('Chương 2');
    expect(sheet?.getCell(5, 4).value).toBe('BT1');
    expect(sheet?.getCell(6, 5).value).toBe('Quiz 1');
    expect(sheet?.getCell(4, 7).value).toBe('TB quá trình');

    expect(sheet?.getCell(7, 2).value).toBe('SV001');
    expect(sheet?.getCell(7, 4).value).toBe(8);
    expect(sheet?.getCell(7, 6).value).toBeNull();
    expect(sheet?.getCell(7, 8).value).toBe(4);
    expect(sheet?.getCell(8, 8).value).toBeNull();

    // Class average per column ignores missing scores.
    expect(sheet?.getCell(9, 3).value).toBe('Trung bình lớp');
    expect(sheet?.getCell(9, 4).value).toBe(7);
    expect(sheet?.getCell(9, 5).value).toBe(4);
    expect(sheet?.getCell(9, 6).value).toBeNull();
  });

  it('still produces a valid sheet for a class without columns or students', async () => {
    const buffer = await buildGradebookWorkbook({
      classCode: 'IT001.02',
      exportedAt: new Date('2026-11-20T03:00:00Z'),
      columns: [],
      rows: [],
      summary: { studentCount: 0, processAvg: null, testAvg: null, belowThresholdCount: 0, threshold: 5 },
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(new Uint8Array(buffer).buffer);
    expect(workbook.getWorksheet('Bảng điểm')).toBeDefined();
  });
});