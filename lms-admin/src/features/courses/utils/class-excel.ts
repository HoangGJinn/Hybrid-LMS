import type { CellValue, Worksheet } from 'exceljs';
import type { ClassImportRowPayload } from '../types/courses.types';

/** Largest import file; the backend enforces the same limit. */
export const MAX_IMPORT_ROWS = 1000;

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CLASSES_SHEET = 'Classes';
const GUIDE_SHEET = 'Guide';

/** Column titles of the template, in the order of the sheet. */
export const CLASS_IMPORT_HEADERS = [
  'Class Code',
  'Class Name',
  'Subject Code',
  'Semester Code',
  'Lecturer Code/Email',
] as const;

/** An example row, shown next to the template so admins can see what each column expects. */
export const CLASS_IMPORT_SAMPLE_ROW: readonly string[] = [
  'WEB26.01',
  'Web development - Group 1',
  'IT001',
  '2026-1',
  'GV26000001',
];

type ClassField = Exclude<keyof ClassImportRowPayload, 'line'>;

const FIELD_ORDER: readonly ClassField[] = [
  'classCode',
  'name',
  'subjectCode',
  'semesterCode',
  'lecturer',
];

/** Accepted header spellings per field, compared after removing case, spaces and punctuation. */
const HEADER_ALIASES: Record<ClassField, readonly string[]> = {
  classCode: ['classcode', 'code'],
  name: ['classname', 'name'],
  subjectCode: ['subjectcode', 'subject'],
  semesterCode: ['semestercode', 'semester'],
  lecturer: [
    'lecturercodeemail',
    'lecturercode',
    'lectureremail',
    'lecturer',
    'email',
  ],
};

export interface ParsedClassImportFile {
  rows: ClassImportRowPayload[];
  /** Why the file cannot be imported; null when `rows` is usable. */
  error: string | null;
}

const failure = (error: string): ParsedClassImportFile => ({ rows: [], error });

const normalizeHeader = (header: string): string =>
  header.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The text of a cell: numbers, dates, rich text, links and formula results all become a string. */
export const cellToText = (value: CellValue | undefined): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  if ('text' in value) return cellToText(value.text);
  if ('result' in value) return cellToText(value.result);
  return '';
};

/**
 * Turns the rows of the first sheet into import rows. `records[0]` is the header, and
 * `records[n]` is row n + 1 of the file, so `line` matches the row numbers Excel shows.
 */
export const parseClassRecords = (records: string[][]): ParsedClassImportFile => {
  const header = (records[0] ?? []).map(normalizeHeader);
  if (header.every((name) => name === '')) return failure('The file is empty.');

  const columnOf = (field: ClassField): number =>
    header.findIndex((name) => HEADER_ALIASES[field].includes(name));
  const columns = FIELD_ORDER.map((field) => ({ field, index: columnOf(field) }));
  const missing = columns
    .filter(({ index }) => index === -1)
    .map(({ field }) => CLASS_IMPORT_HEADERS[FIELD_ORDER.indexOf(field)]);
  if (missing.length > 0) {
    return failure(
      `The first row must be a header. Missing column: ${missing.join(', ')}.`,
    );
  }

  const rows: ClassImportRowPayload[] = [];
  records.slice(1).forEach((record, offset) => {
    if (record.every((cell) => cell.trim() === '')) return;
    const row: ClassImportRowPayload = { line: offset + 2 };
    for (const { field, index } of columns) {
      const value = (record[index] ?? '').trim();
      if (value) row[field] = value;
    }
    rows.push(row);
  });

  if (rows.length === 0) return failure('The file has no class rows.');
  if (rows.length > MAX_IMPORT_ROWS) {
    return failure(
      `A file can contain at most ${MAX_IMPORT_ROWS} classes; this one has ${rows.length}.`,
    );
  }
  return { rows, error: null };
};

/** The cells of a sheet as text: `records[n]` is row n + 1, so indexes match the row numbers Excel shows. */
export const sheetToRecords = (sheet: Worksheet): string[][] => {
  const records: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cells[columnNumber - 1] = cellToText(cell.value);
    });
    records[rowNumber - 1] = Array.from(cells, (cell) => cell ?? '');
  });
  return Array.from(records, (record) => record ?? []);
};

/** Reads an .xlsx file: the sheet named "Classes" if there is one, otherwise the first sheet. */
export const parseClassWorkbook = async (
  content: ArrayBuffer,
): Promise<ParsedClassImportFile> => {
  // Loaded on demand: the library is large and only this dialog needs it.
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(content);
  } catch {
    return failure('This is not a valid Excel (.xlsx) file.');
  }
  const sheet = workbook.getWorksheet(CLASSES_SHEET) ?? workbook.worksheets[0];
  if (!sheet) return failure('The file has no sheet.');

  return parseClassRecords(sheetToRecords(sheet));
};

const GUIDE_ROWS: readonly (readonly string[])[] = [
  ['Column', 'Meaning', 'Example'],
  ['Class Code', 'Unique code of the class. A code that already exists is skipped.', 'WEB26.01'],
  ['Class Name', 'Display name of the class.', 'Web development - Group 1'],
  ['Subject Code', 'Code of an existing subject.', 'IT001'],
  ['Semester Code', 'Code of an existing semester.', '2026-1'],
  ['Lecturer Code/Email', 'Code or email of a lecturer who is currently working.', 'GV26000001'],
];

/** The downloadable template: an empty "Classes" sheet to fill in, plus a "Guide" sheet. */
export const buildClassTemplate = async (): Promise<Blob> => {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  const classes = workbook.addWorksheet(CLASSES_SHEET);
  classes.addRow([...CLASS_IMPORT_HEADERS]);
  classes.getRow(1).font = { bold: true };
  CLASS_IMPORT_HEADERS.forEach((_header, index) => {
    const column = classes.getColumn(index + 1);
    column.width = 26;
    // Text format: Excel would otherwise turn a code such as 2026-1 into a date.
    column.numFmt = '@';
  });
  classes.views = [{ state: 'frozen', ySplit: 1 }];

  const guide = workbook.addWorksheet(GUIDE_SHEET);
  GUIDE_ROWS.forEach((row) => guide.addRow([...row]));
  guide.getRow(1).font = { bold: true };
  [24, 62, 28].forEach((width, index) => {
    guide.getColumn(index + 1).width = width;
  });

  return new Blob([await workbook.xlsx.writeBuffer()], { type: XLSX_MIME });
};