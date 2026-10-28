import { describe, expect, it } from 'vitest';
import type { ParticipantView } from '../types/participant-management.types';
import {
  MAX_IMPORT_ROWS,
  buildParticipantsCsv,
  escapeCsvCell,
  parseCsv,
  parseParticipantCsv,
  participantsFileName,
} from './participant-csv';

const createParticipant = (
  overrides: Partial<ParticipantView> = {},
): ParticipantView => ({
  studentId: 'stu-1',
  studentCode: 'SV26000001',
  fullName: 'Nguyen Van A',
  email: 'a@school.edu.vn',
  status: 'STUDYING',
  isActive: true,
  joinedAt: '2026-10-01T08:30:00.000Z',
  ...overrides,
});

describe('escapeCsvCell', () => {
  it('should leave plain text alone', () => {
    expect(escapeCsvCell('Nguyen Van A')).toBe('Nguyen Van A');
  });

  it('should quote cells with a comma, a quote or a line break', () => {
    expect(escapeCsvCell('Nguyen, Van A')).toBe('"Nguyen, Van A"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('should neutralise text a spreadsheet would run as a formula', () => {
    expect(escapeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
  });
});

describe('buildParticipantsCsv', () => {
  it('should write a header and one row per participant', () => {
    const csv = buildParticipantsCsv([
      createParticipant(),
      createParticipant({
        studentId: 'stu-2',
        studentCode: 'SV26000002',
        fullName: 'Tran, Thi B',
        email: 'b@school.edu.vn',
      }),
    ]);

    expect(csv.split('\r\n')).toEqual([
      'Student Code,Full Name,Email,Status,Joined At',
      'SV26000001,Nguyen Van A,a@school.edu.vn,STUDYING,2026-10-01',
      'SV26000002,"Tran, Thi B",b@school.edu.vn,STUDYING,2026-10-01',
      '',
    ]);
  });

  it('should write only the header for an empty class', () => {
    expect(buildParticipantsCsv([])).toBe(
      'Student Code,Full Name,Email,Status,Joined At\r\n',
    );
  });

  it('should produce a file that can be imported again', () => {
    const parsed = parseParticipantCsv(
      buildParticipantsCsv([
        createParticipant(),
        createParticipant({ studentCode: 'SV26000002', email: 'b@school.edu.vn' }),
      ]),
    );

    expect(parsed.error).toBeNull();
    expect(parsed.rows).toEqual([
      { line: 2, studentCode: 'SV26000001', email: 'a@school.edu.vn' },
      { line: 3, studentCode: 'SV26000002', email: 'b@school.edu.vn' },
    ]);
  });
});

describe('participantsFileName', () => {
  it('should build the file name from the class code', () => {
    expect(participantsFileName('CS101.Q11')).toBe('CS101.Q11-participants.csv');
  });

  it('should replace characters that are unsafe in file names', () => {
    expect(participantsFileName('CS 101/Q11')).toBe('CS_101_Q11-participants.csv');
  });
});

describe('parseCsv', () => {
  it('should split lines and cells, whatever the line ending', () => {
    expect(parseCsv('a,b\r\nc,d\ne,f\rg,h')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e', 'f'],
      ['g', 'h'],
    ]);
  });

  it('should read quoted cells with commas, doubled quotes and line breaks', () => {
    expect(parseCsv('"a, b","say ""hi""","x\ny"\n')).toEqual([
      ['a, b', 'say "hi"', 'x\ny'],
    ]);
  });

  it('should ignore a byte-order mark', () => {
    expect(parseCsv('\uFEFFa,b')).toEqual([['a', 'b']]);
  });

  it('should detect a semicolon delimiter (Excel in many locales)', () => {
    expect(parseCsv('Student Code;Email\nSV1;a@x.vn')).toEqual([
      ['Student Code', 'Email'],
      ['SV1', 'a@x.vn'],
    ]);
  });
});

describe('parseParticipantCsv', () => {
  it('should read rows by header name, in any column order and case', () => {
    const parsed = parseParticipantCsv(
      'EMAIL,Full Name,student_code\na@school.edu.vn,Nguyen Van A,SV26000001\n',
    );

    expect(parsed).toEqual({
      error: null,
      rows: [{ line: 2, studentCode: 'SV26000001', email: 'a@school.edu.vn' }],
    });
  });

  it('should accept a file with only an email column', () => {
    const parsed = parseParticipantCsv('Email\na@school.edu.vn\nb@school.edu.vn');

    expect(parsed.rows).toEqual([
      { line: 2, studentCode: undefined, email: 'a@school.edu.vn' },
      { line: 3, studentCode: undefined, email: 'b@school.edu.vn' },
    ]);
  });

  it('should skip blank lines but keep the row numbers of the file', () => {
    const parsed = parseParticipantCsv('Student Code\nSV1\n\n,\nSV2\n');

    expect(parsed.rows.map((row) => [row.line, row.studentCode])).toEqual([
      [2, 'SV1'],
      [5, 'SV2'],
    ]);
  });

  it('should pass on a row that has no code and no email so the server can report it', () => {
    const parsed = parseParticipantCsv('Student Code,Full Name\n,Nguyen Van A\n');

    expect(parsed.rows).toEqual([
      { line: 2, studentCode: undefined, email: undefined },
    ]);
  });

  it('should reject an empty file', () => {
    expect(parseParticipantCsv('').error).toBe('The file is empty.');
  });

  it('should reject a file without a code or email column', () => {
    expect(parseParticipantCsv('Name\nNguyen Van A').error).toMatch(
      /Student Code.*Email/,
    );
  });

  it('should reject a file with a header only', () => {
    expect(parseParticipantCsv('Student Code,Email\n').error).toBe(
      'The file has no student rows.',
    );
  });

  it('should reject a file with too many rows', () => {
    const lines = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `SV${i}`);

    expect(parseParticipantCsv(['Student Code', ...lines].join('\n')).error).toBe(
      `A file can contain at most ${MAX_IMPORT_ROWS} students; this one has ${MAX_IMPORT_ROWS + 1}.`,
    );
  });
});
