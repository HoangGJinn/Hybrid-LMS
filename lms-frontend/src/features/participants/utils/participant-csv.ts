import type {
  ImportRowPayload,
  ParticipantView,
} from '../types/participant-management.types';

/** Largest import file; the backend enforces the same limit. */
export const MAX_IMPORT_ROWS = 1000;

const EXPORT_HEADER = ['Student Code', 'Full Name', 'Email', 'Status', 'Joined At'];

/** Header of the downloadable import template. */
export const IMPORT_TEMPLATE_CSV = 'Student Code,Email\r\n';

const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One CSV cell. Text that a spreadsheet would run as a formula (starts with = + - @) gets a leading
 * apostrophe, and cells with a comma, quote or line break are quoted.
 */
export const escapeCsvCell = (value: string): string => {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const toDay = (iso: string): string => (/^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : '');

/** The export file of a class: one row per participant, same columns an import understands. */
export const buildParticipantsCsv = (participants: ParticipantView[]): string =>
  [
    EXPORT_HEADER,
    ...participants.map((p) => [
      p.studentCode,
      p.fullName,
      p.email,
      p.status,
      toDay(p.joinedAt),
    ]),
  ]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n')
    .concat('\r\n');

/** `CS101.Q11` -> `CS101.Q11-participants.csv`; characters unsafe in file names become `_`. */
export const participantsFileName = (classCode: string): string =>
  `${classCode.replace(/[^A-Za-z0-9._-]+/g, '_')}-participants.csv`;

/** Comma, semicolon (Excel in many locales) or tab: whichever is most common in the header line. */
const detectDelimiter = (text: string): string => {
  const firstLine = text.split(/\r\n|\r|\n/, 1)[0] ?? '';
  const count = (character: string) => firstLine.split(character).length - 1;
  return [',', ';', '\t'].reduce((best, candidate) =>
    count(candidate) > count(best) ? candidate : best,
  );
};

/** RFC 4180 style parser: quoted cells, doubled quotes, CRLF / LF / CR line ends, leading BOM. */
export const parseCsv = (input: string): string[][] => {
  const text = input.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);
  const records: string[][] = [];
  let record: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inQuotes) {
      if (character !== '"') {
        cell += character;
      } else if (text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = false;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === delimiter) {
      record.push(cell);
      cell = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      record.push(cell);
      records.push(record);
      record = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (cell !== '' || record.length > 0) {
    record.push(cell);
    records.push(record);
  }
  return records;
};

export interface ParsedImportFile {
  rows: ImportRowPayload[];
  /** Why the file cannot be imported; null when `rows` is usable. */
  error: string | null;
}

const normalizeHeader = (header: string): string =>
  header.toLowerCase().replace(/[^a-z0-9]/g, '');

const CODE_HEADERS = ['studentcode', 'code'];
const EMAIL_HEADERS = ['email', 'emailaddress'];

const failure = (error: string): ParsedImportFile => ({ rows: [], error });

/**
 * Reads an import file: a header row with a "Student Code" and/or an "Email" column, then one
 * student per row. Other columns (name, status, ...) are ignored, so an exported file can be imported again.
 */
export const parseParticipantCsv = (text: string): ParsedImportFile => {
  const records = parseCsv(text);
  if (records.length === 0) return failure('The file is empty.');

  const header = records[0].map(normalizeHeader);
  const codeColumn = header.findIndex((name) => CODE_HEADERS.includes(name));
  const emailColumn = header.findIndex((name) => EMAIL_HEADERS.includes(name));
  if (codeColumn === -1 && emailColumn === -1) {
    return failure(
      'The first row must be a header with a "Student Code" and/or an "Email" column.',
    );
  }

  const rows: ImportRowPayload[] = [];
  records.slice(1).forEach((record, index) => {
    if (record.every((cell) => cell.trim() === '')) return;
    const studentCode = codeColumn === -1 ? '' : (record[codeColumn] ?? '').trim();
    const email = emailColumn === -1 ? '' : (record[emailColumn] ?? '').trim();
    rows.push({
      line: index + 2, // the header is row 1
      studentCode: studentCode || undefined,
      email: email || undefined,
    });
  });

  if (rows.length === 0) return failure('The file has no student rows.');
  if (rows.length > MAX_IMPORT_ROWS) {
    return failure(
      `A file can contain at most ${MAX_IMPORT_ROWS} students; this one has ${rows.length}.`,
    );
  }
  return { rows, error: null };
};
