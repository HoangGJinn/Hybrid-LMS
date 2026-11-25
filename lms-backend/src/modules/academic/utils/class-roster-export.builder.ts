import ExcelJS from 'exceljs';
import {
  applyBorders,
  setColumnWidths,
  styleHeaderRow,
} from '../../../shared/excel/workbook.util.js';

export interface RosterClassRow {
  readonly classCode: string;
  readonly name: string;
  readonly subjectCode: string;
  readonly subjectName: string;
  readonly semesterCode: string;
  readonly semesterName: string;
  readonly lecturerCode: string;
  readonly lecturerName: string;
  readonly studentCount: number;
  readonly isActive: boolean;
}

export interface RosterStudentRow {
  readonly classCode: string;
  readonly studentCode: string;
  readonly email: string;
  readonly fullName: string;
}

const HEADER_ROW = 1;

/**
 * The first columns of each sheet are exactly those of the import template (same titles, same
 * order); the columns after them are for reading only and are ignored when the file is imported
 * again, because the importer finds its columns by title.
 */
export const CLASS_SHEET_HEADERS = [
  'Class Code',
  'Class Name',
  'Subject Code',
  'Semester Code',
  'Lecturer Code/Email',
  // Read-only from here on.
  'Subject Name',
  'Semester Name',
  'Lecturer Name',
  'Students',
  'Status',
] as const;

export const STUDENT_SHEET_HEADERS = [
  'Class Code',
  'Student Code',
  'Email',
  // Read-only from here on.
  'Full Name',
] as const;

const CLASS_WIDTHS = [16, 34, 14, 14, 20, 30, 24, 26, 10, 12] as const;
const STUDENT_WIDTHS = [16, 16, 32, 28] as const;

const addSheet = (
  workbook: ExcelJS.Workbook,
  name: string,
  headers: readonly string[],
  widths: readonly number[],
  rows: readonly (readonly (string | number)[])[],
): void => {
  const sheet = workbook.addWorksheet(name);
  const header = sheet.getRow(HEADER_ROW);
  header.values = [...headers];
  styleHeaderRow(header);
  rows.forEach((row) => sheet.addRow([...row]));
  if (rows.length > 0) {
    applyBorders(sheet, HEADER_ROW + 1, HEADER_ROW + rows.length, 1, headers.length);
  }
  setColumnWidths(sheet, widths);
  sheet.views = [{ state: 'frozen', ySplit: HEADER_ROW }];
  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW, column: headers.length },
  };
};

/** Two sheets, `Classes` and `Students`, laid out like the import template so the file can be imported back. */
export const buildClassRosterWorkbook = async (
  classes: readonly RosterClassRow[],
  students: readonly RosterStudentRow[],
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  addSheet(
    workbook,
    'Classes',
    CLASS_SHEET_HEADERS,
    CLASS_WIDTHS,
    classes.map((row) => [
      row.classCode,
      row.name,
      row.subjectCode,
      row.semesterCode,
      row.lecturerCode,
      row.subjectName,
      row.semesterName,
      row.lecturerName,
      row.studentCount,
      row.isActive ? 'ACTIVE' : 'ENDED',
    ]),
  );
  addSheet(
    workbook,
    'Students',
    STUDENT_SHEET_HEADERS,
    STUDENT_WIDTHS,
    students.map((row) => [
      row.classCode,
      row.studentCode,
      row.email,
      row.fullName,
    ]),
  );
  return Buffer.from(await workbook.xlsx.writeBuffer());
};
