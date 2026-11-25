import ExcelJS from 'exceljs';
import {
  applyBorders,
  setColumnWidths,
  styleHeaderRow,
} from '../../../shared/excel/workbook.util.js';

export interface ReferenceSubjectRow {
  readonly subjectCode: string;
  readonly name: string;
  readonly description: string;
}

export interface ReferenceSemesterRow {
  readonly semesterCode: string;
  readonly name: string;
  /** `dd/MM/yyyy`, Vietnam time. */
  readonly startDate: string;
  /** `dd/MM/yyyy`, Vietnam time. */
  readonly endDate: string;
}

export interface ReferenceLecturerRow {
  readonly lecturerCode: string;
  readonly fullName: string;
  readonly email: string;
  /** `Available`, or why the lecturer cannot be given a class. */
  readonly availability: string;
}

const HEADER_ROW = 1;

const addSheet = (
  workbook: ExcelJS.Workbook,
  name: string,
  headers: readonly string[],
  widths: readonly number[],
  rows: readonly (readonly string[])[],
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
  // Text format: Excel would otherwise turn a code such as 2026-1 or a date into something else
  // when the admin edits a cell.
  headers.forEach((_header, index) => {
    sheet.getColumn(index + 1).numFmt = '@';
  });
  sheet.views = [{ state: 'frozen', ySplit: HEADER_ROW }];
  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW, column: headers.length },
  };
};

/** The codes an admin has to type into the import templates: subjects, semesters and lecturers. */
export const buildReferenceCodesWorkbook = async (data: {
  subjects: readonly ReferenceSubjectRow[];
  semesters: readonly ReferenceSemesterRow[];
  lecturers: readonly ReferenceLecturerRow[];
}): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  addSheet(
    workbook,
    'Subjects',
    ['Subject Code', 'Subject Name', 'Description'],
    [16, 36, 50],
    data.subjects.map((s) => [s.subjectCode, s.name, s.description]),
  );
  addSheet(
    workbook,
    'Semesters',
    ['Semester Code', 'Semester Name', 'Start Date', 'End Date'],
    [16, 30, 14, 14],
    data.semesters.map((s) => [s.semesterCode, s.name, s.startDate, s.endDate]),
  );
  addSheet(
    workbook,
    'Lecturers',
    ['Lecturer Code', 'Full Name', 'Email', 'Availability'],
    [16, 28, 34, 60],
    data.lecturers.map((l) => [
      l.lecturerCode,
      l.fullName,
      l.email,
      l.availability,
    ]),
  );
  return Buffer.from(await workbook.xlsx.writeBuffer());
};
