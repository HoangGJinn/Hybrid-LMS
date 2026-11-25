import type {
  SemesterImportRowPayload,
  SubjectImportRowPayload,
} from '../types/courses.types';
import { MAX_IMPORT_ROWS, sheetToRecords } from './class-excel';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const GUIDE_SHEET = 'Guide';

/** What differs between the subject and the semester file; everything else is shared. */
interface CatalogSpec<Field extends string> {
  /** Name of the sheet to read (the first sheet is used when there is none of that name). */
  sheet: string;
  /** What a row is, for messages ("subject"). */
  noun: string;
  fields: readonly Field[];
  /** Column titles of the template, one per field and in the same order. */
  headers: readonly string[];
  /** Accepted header spellings per field, compared after removing case, spaces and punctuation. */
  aliases: Record<Field, readonly string[]>;
  /** Fields whose column may be missing altogether. */
  optional: readonly Field[];
  guide: readonly (readonly string[])[];
}

type CatalogRow<Field extends string> = { line: number } & {
  [K in Field]?: string;
};

export interface ParsedCatalogFile<Row> {
  rows: Row[];
  /** Why the file cannot be imported; null when `rows` is usable. */
  error: string | null;
}

const normalizeHeader = (header: string): string =>
  header.toLowerCase().replace(/[^a-z0-9]/g, '');

const parseRecords = <Field extends string>(
  spec: CatalogSpec<Field>,
  records: string[][],
): ParsedCatalogFile<CatalogRow<Field>> => {
  const fail = (error: string): ParsedCatalogFile<CatalogRow<Field>> => ({
    rows: [],
    error,
  });
  const header = (records[0] ?? []).map(normalizeHeader);
  if (header.every((name) => name === '')) return fail('The file is empty.');

  const columns = spec.fields.map((field, position) => ({
    field,
    title: spec.headers[position],
    index: header.findIndex((name) => spec.aliases[field].includes(name)),
  }));
  const missing = columns
    .filter(({ field, index }) => index === -1 && !spec.optional.includes(field))
    .map(({ title }) => title);
  if (missing.length > 0) {
    return fail(
      `The first row must be a header. Missing column: ${missing.join(', ')}.`,
    );
  }

  const rows: CatalogRow<Field>[] = [];
  records.slice(1).forEach((record, offset) => {
    if (record.every((cell) => cell.trim() === '')) return;
    // `records[n]` is row n + 1 of the file, so `line` matches the row numbers Excel shows.
    const row: Record<string, string | number> = { line: offset + 2 };
    for (const { field, index } of columns) {
      if (index === -1) continue;
      const value = (record[index] ?? '').trim();
      if (value) row[field] = value;
    }
    rows.push(row as CatalogRow<Field>);
  });

  if (rows.length === 0) return fail(`The file has no ${spec.noun} rows.`);
  if (rows.length > MAX_IMPORT_ROWS) {
    return fail(
      `A file can contain at most ${MAX_IMPORT_ROWS} ${spec.noun}s; this one has ${rows.length}.`,
    );
  }
  return { rows, error: null };
};

const parseWorkbook = async <Field extends string>(
  spec: CatalogSpec<Field>,
  content: ArrayBuffer,
): Promise<ParsedCatalogFile<CatalogRow<Field>>> => {
  // Loaded on demand: the library is large and only the import page needs it.
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(content);
  } catch {
    return { rows: [], error: 'This is not a valid Excel (.xlsx) file.' };
  }
  const sheet = workbook.getWorksheet(spec.sheet) ?? workbook.worksheets[0];
  if (!sheet) return { rows: [], error: 'The file has no sheet.' };
  return parseRecords(spec, sheetToRecords(sheet));
};

const buildTemplate = async <Field extends string>(
  spec: CatalogSpec<Field>,
): Promise<Blob> => {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  const data = workbook.addWorksheet(spec.sheet);
  data.addRow([...spec.headers]);
  data.getRow(1).font = { bold: true };
  spec.headers.forEach((_header, index) => {
    const column = data.getColumn(index + 1);
    column.width = 26;
    // Text format: Excel would otherwise turn a code such as 2026-1 or a date into something else.
    column.numFmt = '@';
  });
  data.views = [{ state: 'frozen', ySplit: 1 }];

  const guide = workbook.addWorksheet(GUIDE_SHEET);
  spec.guide.forEach((row) => guide.addRow([...row]));
  guide.getRow(1).font = { bold: true };
  [24, 62, 28].forEach((width, index) => {
    guide.getColumn(index + 1).width = width;
  });

  return new Blob([await workbook.xlsx.writeBuffer()], { type: XLSX_MIME });
};

// ---- Subjects ------------------------------------------------------------------------------

type SubjectField = Exclude<keyof SubjectImportRowPayload, 'line'>;

export const SUBJECT_IMPORT_HEADERS = [
  'Subject Code',
  'Subject Name',
  'Description',
] as const;

export const SUBJECT_IMPORT_SAMPLE_ROW: readonly string[] = [
  'IT001',
  'Web programming',
  'Introduction to HTML, CSS and JavaScript.',
];

const SUBJECT_SPEC: CatalogSpec<SubjectField> = {
  sheet: 'Subjects',
  noun: 'subject',
  fields: ['subjectCode', 'name', 'description'],
  headers: SUBJECT_IMPORT_HEADERS,
  aliases: {
    subjectCode: ['subjectcode', 'code'],
    name: ['subjectname', 'name'],
    description: ['description', 'desc'],
  },
  optional: ['description'],
  guide: [
    ['Column', 'Meaning', 'Example'],
    ['Subject Code', 'Unique code of the subject. A code that already exists is skipped.', 'IT001'],
    ['Subject Name', 'Display name of the subject.', 'Web programming'],
    ['Description', 'Optional. A short description.', 'Introduction to the web'],
  ],
};

export const parseSubjectRecords = (records: string[][]) =>
  parseRecords(SUBJECT_SPEC, records);
export const parseSubjectWorkbook = (content: ArrayBuffer) =>
  parseWorkbook(SUBJECT_SPEC, content);
export const buildSubjectTemplate = () => buildTemplate(SUBJECT_SPEC);

// ---- Semesters -----------------------------------------------------------------------------

type SemesterField = Exclude<keyof SemesterImportRowPayload, 'line'>;

export const SEMESTER_IMPORT_HEADERS = [
  'Semester Code',
  'Semester Name',
  'Start Date',
  'End Date',
] as const;

export const SEMESTER_IMPORT_SAMPLE_ROW: readonly string[] = [
  '2026-1',
  'Semester 1, 2026-2027',
  '01/09/2026',
  '31/12/2026',
];

const SEMESTER_SPEC: CatalogSpec<SemesterField> = {
  sheet: 'Semesters',
  noun: 'semester',
  fields: ['semesterCode', 'name', 'startDate', 'endDate'],
  headers: SEMESTER_IMPORT_HEADERS,
  aliases: {
    semesterCode: ['semestercode', 'code'],
    name: ['semestername', 'name'],
    startDate: ['startdate', 'start', 'from'],
    endDate: ['enddate', 'end', 'to'],
  },
  optional: [],
  guide: [
    ['Column', 'Meaning', 'Example'],
    ['Semester Code', 'Unique code of the semester. A code that already exists is skipped.', '2026-1'],
    ['Semester Name', 'Display name of the semester.', 'Semester 1, 2026-2027'],
    ['Start Date', 'First day, dd/MM/yyyy or yyyy-MM-dd, Vietnam time (starts at 00:00).', '01/09/2026'],
    ['End Date', 'Last day, dd/MM/yyyy or yyyy-MM-dd, Vietnam time (ends at 23:59). Not before the start date.', '31/12/2026'],
  ],
};

export const parseSemesterRecords = (records: string[][]) =>
  parseRecords(SEMESTER_SPEC, records);
export const parseSemesterWorkbook = (content: ArrayBuffer) =>
  parseWorkbook(SEMESTER_SPEC, content);
export const buildSemesterTemplate = () => buildTemplate(SEMESTER_SPEC);
