import ExcelJS from 'exceljs';
import {
  applyBorders,
  formatExportDateTime,
  setColumnWidths,
  styleHeaderRow,
} from '../../../shared/excel/workbook.util.js';

/** Whose class list it is: a lecturer's (classes taught) or a student's (classes enrolled in). */
export type ClassListAudience = 'LECTURER' | 'STUDENT';

export interface ClassListExportRow {
  readonly classCode: string;
  readonly name: string;
  readonly subjectCode: string;
  readonly subjectName: string;
  readonly semesterCode: string;
  readonly semesterName: string;
  readonly lecturerName: string;
  readonly studentCount: number;
  readonly isActive: boolean;
  readonly endedAt: Date | null;
  /** When the student joined the class; null for a lecturer's list. */
  readonly joinedAt: Date | null;
}

const HEADER_ROW = 1;

const BASE_HEADERS = [
  'Class Code',
  'Class Name',
  'Subject Code',
  'Subject Name',
  'Semester Code',
  'Semester Name',
] as const;

const BASE_WIDTHS = [16, 34, 14, 30, 14, 24] as const;

/**
 * One sheet, one row per class. A lecturer's list leaves out the lecturer (it is always the same
 * person); a student's list adds who teaches each class and when the student joined it.
 */
export const buildClassListWorkbook = async (
  audience: ClassListAudience,
  rows: readonly ClassListExportRow[],
): Promise<Buffer> => {
  const isStudent = audience === 'STUDENT';
  const headers = [
    ...BASE_HEADERS,
    ...(isStudent ? ['Lecturer'] : []),
    'Students',
    'Status',
    'Ended At',
    ...(isStudent ? ['Joined At'] : []),
  ];
  const widths = [
    ...BASE_WIDTHS,
    ...(isStudent ? [26] : []),
    10,
    10,
    18,
    ...(isStudent ? [18] : []),
  ];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Classes');
  const header = sheet.getRow(HEADER_ROW);
  header.values = headers;
  styleHeaderRow(header);

  rows.forEach((row) => {
    sheet.addRow([
      row.classCode,
      row.name,
      row.subjectCode,
      row.subjectName,
      row.semesterCode,
      row.semesterName,
      ...(isStudent ? [row.lecturerName] : []),
      row.studentCount,
      row.isActive ? 'ACTIVE' : 'ENDED',
      formatExportDateTime(row.endedAt),
      ...(isStudent ? [formatExportDateTime(row.joinedAt)] : []),
    ]);
  });

  applyBorders(
    sheet,
    HEADER_ROW + 1,
    HEADER_ROW + rows.length,
    1,
    headers.length,
  );
  setColumnWidths(sheet, widths);
  sheet.views = [{ state: 'frozen', ySplit: HEADER_ROW, xSplit: 1 }];
  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW, column: headers.length },
  };

  return Buffer.from(await workbook.xlsx.writeBuffer());
};