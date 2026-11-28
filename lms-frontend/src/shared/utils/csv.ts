/** Largest CSV import file read in the browser; larger files would only freeze the page. */
export const MAX_CSV_BYTES = 2 * 1024 * 1024;

const FORMULA_START = /^[=+\-@\t\r]/;

/** Lowercases a header cell and strips spaces and punctuation so `"Student Code"` matches `"student_code"`. */
export const normalizeCsvHeader = (header: string): string =>
  header.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Checks the picked CSV file before it is read; `null` when its size is valid. */
export const validateCsvFile = (file: { size: number }): string | null => {
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_CSV_BYTES)
    return 'This file is too large. Use a CSV file of at most 2 MB.';
  return null;
};

export type CsvFileReadResult =
  | { text: string; error: null }
  | { text: null; error: string };

/** Validates a picked CSV file's size and reads its UTF-8 text. */
export const readCsvFile = async (
  file: Pick<File, 'size' | 'text'>,
): Promise<CsvFileReadResult> => {
  const error = validateCsvFile(file);
  if (error) return { text: null, error };
  return { text: await file.text(), error: null };
};

/**
 * One CSV cell. Text that a spreadsheet would run as a formula (starts with = + - @) gets a leading
 * apostrophe, and cells with a comma, quote or line break are quoted.
 */
export const escapeCsvCell = (value: string): string => {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

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

