import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { MAX_IMPORT_ROWS } from './class-excel';
import {
  SEMESTER_IMPORT_HEADERS,
  SUBJECT_IMPORT_HEADERS,
  buildSemesterTemplate,
  buildSubjectTemplate,
  parseSemesterRecords,
  parseSemesterWorkbook,
  parseSubjectRecords,
  parseSubjectWorkbook,
} from './catalog-excel';

const toArrayBuffer = async (workbook: ExcelJS.Workbook): Promise<ArrayBuffer> =>
  new Uint8Array(await workbook.xlsx.writeBuffer()).buffer;

describe('parseSubjectRecords', () => {
  it('maps the columns to fields and keeps the row numbers of the file', () => {
    const parsed = parseSubjectRecords([
      [...SUBJECT_IMPORT_HEADERS],
      ['IT001', 'Web programming', 'Basics'],
      ['', '', ''],
      ['IT002', 'Databases', ''],
    ]);
    expect(parsed.error).toBeNull();
    expect(parsed.rows).toEqual([
      { line: 2, subjectCode: 'IT001', name: 'Web programming', description: 'Basics' },
      { line: 4, subjectCode: 'IT002', name: 'Databases' },
    ]);
  });

  it('accepts other spellings of the titles, in any order', () => {
    const parsed = parseSubjectRecords([
      ['name', 'CODE'],
      ['Web', 'IT001'],
    ]);
    expect(parsed.rows).toEqual([{ line: 2, subjectCode: 'IT001', name: 'Web' }]);
  });

  it('works without a Description column', () => {
    const parsed = parseSubjectRecords([['Subject Code', 'Subject Name'], ['IT001', 'Web']]);
    expect(parsed.error).toBeNull();
    expect(parsed.rows).toHaveLength(1);
  });

  it('names the missing columns', () => {
    const parsed = parseSubjectRecords([['Subject Code'], ['IT001']]);
    expect(parsed.error).toContain('Missing column: Subject Name');
  });

  it('rejects an empty file and a file without rows', () => {
    expect(parseSubjectRecords([]).error).toBe('The file is empty.');
    expect(parseSubjectRecords([[...SUBJECT_IMPORT_HEADERS]]).error).toBe(
      'The file has no subject rows.',
    );
  });

  it('rejects more rows than one import takes', () => {
    const records = [
      [...SUBJECT_IMPORT_HEADERS],
      ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_v, i) => [`S${i}`, 'N', '']),
    ];
    expect(parseSubjectRecords(records).error).toContain(`at most ${MAX_IMPORT_ROWS} subjects`);
  });
});

describe('parseSemesterRecords', () => {
  it('reads codes, names and the dates as text', () => {
    const parsed = parseSemesterRecords([
      [...SEMESTER_IMPORT_HEADERS],
      ['2026-1', 'Semester 1', '01/09/2026', '31/12/2026'],
      ['2026-2', 'Semester 2', '2027-01-15', '2027-05-30'],
    ]);
    expect(parsed.error).toBeNull();
    expect(parsed.rows).toEqual([
      { line: 2, semesterCode: '2026-1', name: 'Semester 1', startDate: '01/09/2026', endDate: '31/12/2026' },
      { line: 3, semesterCode: '2026-2', name: 'Semester 2', startDate: '2027-01-15', endDate: '2027-05-30' },
    ]);
  });

  it('needs every column, so the exported Semesters sheet can be re-used', () => {
    const missing = parseSemesterRecords([['Semester Code', 'Semester Name', 'Start Date'], ['a', 'b', 'c']]);
    expect(missing.error).toContain('Missing column: End Date');
    // The same four titles the reference-codes export writes.
    const exported = parseSemesterRecords([
      ['Semester Code', 'Semester Name', 'Start Date', 'End Date'],
      ['2026-1', 'Semester 1', '01/09/2026', '31/12/2026'],
    ]);
    expect(exported.error).toBeNull();
  });
});

describe('workbooks', () => {
  it('reads the template back: a filled "Subjects" sheet', async () => {
    const template = await buildSubjectTemplate();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await template.arrayBuffer());
    expect(workbook.worksheets.map((s) => s.name)).toEqual(['Subjects', 'Guide']);
    workbook.getWorksheet('Subjects')!.addRow(['IT001', 'Web programming']);

    const parsed = await parseSubjectWorkbook(await toArrayBuffer(workbook));
    expect(parsed.rows).toEqual([{ line: 2, subjectCode: 'IT001', name: 'Web programming' }]);
  });

  it('reads Excel date cells of a semester file as calendar days', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Semesters');
    sheet.addRow([...SEMESTER_IMPORT_HEADERS]);
    sheet.addRow(['2026-1', 'Semester 1', new Date('2026-09-01T00:00:00Z'), new Date('2026-12-31T00:00:00Z')]);

    const parsed = await parseSemesterWorkbook(await toArrayBuffer(workbook));
    expect(parsed.rows).toEqual([
      { line: 2, semesterCode: '2026-1', name: 'Semester 1', startDate: '2026-09-01', endDate: '2026-12-31' },
    ]);
  });

  it('builds a semester template with the guide sheet', async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await (await buildSemesterTemplate()).arrayBuffer());
    expect(workbook.worksheets.map((s) => s.name)).toEqual(['Semesters', 'Guide']);
    expect(workbook.getWorksheet('Semesters')!.getRow(1).values).toEqual([
      undefined,
      ...SEMESTER_IMPORT_HEADERS,
    ]);
  });

  it('refuses a file that is not an .xlsx', async () => {
    const parsed = await parseSubjectWorkbook(new TextEncoder().encode('nope').buffer);
    expect(parsed.error).toBe('This is not a valid Excel (.xlsx) file.');
  });
});
