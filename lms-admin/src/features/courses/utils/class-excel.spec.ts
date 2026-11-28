import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  CLASS_IMPORT_HEADERS,
  MAX_IMPORT_ROWS,
  buildClassTemplate,
  cellToText,
  parseClassRecords,
  parseClassWorkbook,
} from './class-excel';

const HEADER = [...CLASS_IMPORT_HEADERS];

const toArrayBuffer = async (workbook: ExcelJS.Workbook): Promise<ArrayBuffer> =>
  new Uint8Array(await workbook.xlsx.writeBuffer()).buffer;

describe('cellToText', () => {
  it('turns every cell type into text', () => {
    expect(cellToText(null)).toBe('');
    expect(cellToText(undefined)).toBe('');
    expect(cellToText('WEB26')).toBe('WEB26');
    expect(cellToText(1001)).toBe('1001');
    expect(cellToText(new Date('2026-01-05T00:00:00Z'))).toBe('2026-01-05');
    expect(cellToText({ richText: [{ text: 'GV' }, { text: '001' }] })).toBe('GV001');
    expect(cellToText({ text: 'b@school.edu.vn', hyperlink: 'mailto:b@school.edu.vn' })).toBe(
      'b@school.edu.vn',
    );
    expect(cellToText({ formula: 'A1&B1', result: 'IT001' })).toBe('IT001');
  });
});

describe('parseClassRecords', () => {
  it('maps the columns to fields and keeps the row numbers of the file', () => {
    const parsed = parseClassRecords([
      HEADER,
      ['WEB26.01', 'Web 1', 'IT001', '2026-1', 'GV26000001'],
      ['', '', '', '', ''],
      ['WEB26.02', 'Web 2', 'IT001', '2026-1', 'b@school.edu.vn'],
    ]);

    expect(parsed.error).toBeNull();
    expect(parsed.rows).toEqual([
      {
        line: 2,
        classCode: 'WEB26.01',
        name: 'Web 1',
        subjectCode: 'IT001',
        semesterCode: '2026-1',
        lecturer: 'GV26000001',
      },
      {
        line: 4,
        classCode: 'WEB26.02',
        name: 'Web 2',
        subjectCode: 'IT001',
        semesterCode: '2026-1',
        lecturer: 'b@school.edu.vn',
      },
    ]);
  });

  it('accepts reordered columns and loose header spelling, and leaves empty cells out', () => {
    const parsed = parseClassRecords([
      ['  lecturer ', 'SEMESTER code', 'subject code', 'class name', 'CLASS CODE'],
      ['GV1', '2026-1', 'IT001', '', 'WEB26'],
    ]);

    expect(parsed.rows).toEqual([
      { line: 2, classCode: 'WEB26', subjectCode: 'IT001', semesterCode: '2026-1', lecturer: 'GV1' },
    ]);
  });

  it('names the missing columns', () => {
    const parsed = parseClassRecords([['Class Code', 'Class Name'], ['A', 'B']]);

    expect(parsed.rows).toEqual([]);
    expect(parsed.error).toBe(
      'The first row must be a header. Missing column: Subject Code, Semester Code, Lecturer Code/Email.',
    );
  });

  it('rejects an empty file and a file with a header only', () => {
    expect(parseClassRecords([]).error).toBe('The file is empty.');
    expect(parseClassRecords([HEADER]).error).toBe('The file has no class rows.');
  });

  it('rejects more rows than the backend accepts', () => {
    const records = [
      HEADER,
      ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => [`C${i}`, 'n', 's', 'e', 'l']),
    ];

    expect(parseClassRecords(records).error).toContain(`at most ${MAX_IMPORT_ROWS}`);
  });
});

describe('parseClassWorkbook', () => {
  it('reads the "Classes" sheet of a real .xlsx file', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Other').addRow(['ignored']);
    const sheet = workbook.addWorksheet('Classes');
    sheet.addRow(HEADER);
    sheet.addRow(['WEB26.01', 'Web 1', 'IT001', '2026-1', 'GV26000001']);
    sheet.addRow(['WEB26.02', 'Web 2', 'IT001', '2026-1', { text: 'b@school.edu.vn', hyperlink: 'mailto:b@school.edu.vn' }]);

    const parsed = await parseClassWorkbook(await toArrayBuffer(workbook));

    expect(parsed.error).toBeNull();
    expect(parsed.rows.map((row) => [row.line, row.classCode, row.lecturer])).toEqual([
      [2, 'WEB26.01', 'GV26000001'],
      [3, 'WEB26.02', 'b@school.edu.vn'],
    ]);
  });

  it('falls back to the first sheet when there is no "Classes" sheet', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sheet1');
    sheet.addRow(HEADER);
    sheet.addRow(['WEB26', 'Web', 'IT001', '2026-1', 'GV1']);

    const parsed = await parseClassWorkbook(await toArrayBuffer(workbook));

    expect(parsed.rows).toHaveLength(1);
  });

  it('reports a file that is not an Excel workbook', async () => {
    const parsed = await parseClassWorkbook(new TextEncoder().encode('a,b,c').buffer);

    expect(parsed.error).toBe('This is not a valid Excel (.xlsx) file.');
  });
});

describe('buildClassTemplate', () => {
  it('has an empty "Classes" sheet with the header, which parses as having no rows', async () => {
    const blob = await buildClassTemplate();
    const content = await blob.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(content);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Classes', 'Guide']);
    expect(workbook.getWorksheet('Classes')?.getRow(1).values).toEqual([undefined, ...HEADER]);

    expect((await parseClassWorkbook(content)).error).toBe('The file has no class rows.');
  });
});