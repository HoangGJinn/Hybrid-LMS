import ExcelJS from 'exceljs';
import { QuestionDifficulty } from '../enums/question-difficulty.enum.js';
import type { RowError } from '../types/import-row-error.type.js';
import { normalizeKey } from './text-normalize.js';

export const MAX_IMPORT_ROWS = 1000;
/** Hard cap on physical rows that contain any value (includes whitespace-only rows). */
const MAX_PHYSICAL_ROWS = MAX_IMPORT_ROWS * 2;
/** Cap on the declared uncompressed size of the .xlsx zip, to stop zip bombs before ExcelJS inflates them. */
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;
const REQUIRED_HEADERS = [
  'question_text',
  'option_a',
  'option_b',
  'correct_answer',
  'kc_name',
] as const;

export interface ParsedQuestionRow {
  /** Excel row number (row 1 is the header). */
  rowNumber: number;
  questionText: string;
  options: { label: string; text: string }[];
  correctLabel: string;
  difficulty: QuestionDifficulty;
  explanation: string | null;
  kcNames: string[];
}

export interface ParseResult {
  /** Rows that passed format validation. KC existence and duplicates are checked later by the service. */
  rows: ParsedQuestionRow[];
  errors: RowError[];
  /** Number of non-empty data rows in the file. */
  totalRows: number;
  /** Set when the whole file is unusable (bad file, missing columns, too many rows). */
  fatalError?: string;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((r) => r.text).join('').trim();
    if ('result' in value) return cellText(value.result as ExcelJS.CellValue);
    if ('text' in value) return String(value.text).trim();
    return '';
  }
  return String(value).trim();
}

function fatal(message: string): ParseResult {
  return { rows: [], errors: [], totalRows: 0, fatalError: message };
}

/**
 * Sums the declared uncompressed size of every zip entry from the central directory,
 * without inflating anything. Returns null if the buffer is not a readable zip.
 * The sizes come from the file's own headers, so this is a first line of defence, not a guarantee.
 */
function zipUncompressedSize(buf: Buffer): number | null {
  const min = Math.max(0, buf.length - 22 - 0xffff);
  let eocd = -1;
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const count = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== 0x02014b50) return null;
    total += buf.readUInt32LE(offset + 24);
    offset +=
      46 +
      buf.readUInt16LE(offset + 28) +
      buf.readUInt16LE(offset + 30) +
      buf.readUInt16LE(offset + 32);
  }
  return total;
}

export async function parseQuestionWorkbook(buffer: Buffer): Promise<ParseResult> {
  const unzipped = zipUncompressedSize(buffer);
  if (unzipped === null) return fatal('File không phải định dạng .xlsx hợp lệ.');
  if (unzipped > MAX_UNCOMPRESSED_BYTES) {
    return fatal('File quá lớn sau khi giải nén. Hãy chia nhỏ file.');
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    return fatal('File không phải định dạng .xlsx hợp lệ.');
  }

  const sheet = workbook.getWorksheet('Questions') ?? workbook.worksheets[0];
  if (!sheet) return fatal('File không có sheet nào.');

  const columns = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const key = cellText(cell.value).toLowerCase();
    if (key && !columns.has(key)) columns.set(key, colNumber);
  });

  const missing = REQUIRED_HEADERS.filter((h) => !columns.has(h));
  if (missing.length > 0) {
    return fatal(`Thiếu cột bắt buộc: ${missing.join(', ')}.`);
  }

  const knownColumns = [...columns.keys()];

  // eachRow skips rows that only carry formatting, so a sheet formatted down to row 1,048,576
  // costs nothing here (unlike looping up to sheet.rowCount).
  const rowNumbers: number[] = [];
  let physical = 0;
  sheet.eachRow((_row, rowNumber) => {
    if (rowNumber < 2) return;
    physical++;
    if (physical <= MAX_PHYSICAL_ROWS) rowNumbers.push(rowNumber);
  });
  if (physical > MAX_PHYSICAL_ROWS) {
    return fatal(`File vượt quá ${MAX_IMPORT_ROWS} câu hỏi. Hãy chia nhỏ file.`);
  }

  const rows: ParsedQuestionRow[] = [];
  const errors: RowError[] = [];
  let totalRows = 0;

  for (const r of rowNumbers) {
    const row = sheet.getRow(r);
    const get = (name: string): string => {
      const col = columns.get(name);
      return col ? cellText(row.getCell(col).value) : '';
    };

    if (knownColumns.every((name) => get(name) === '')) continue; // blank row

    totalRows++;
    if (totalRows > MAX_IMPORT_ROWS) {
      return fatal(`File vượt quá ${MAX_IMPORT_ROWS} câu hỏi. Hãy chia nhỏ file.`);
    }

    const rowErrors: RowError[] = [];
    const fail = (field: string, message: string) =>
      rowErrors.push({ row: r, field, message });

    const questionText = get('question_text');
    if (!questionText) fail('question_text', 'Thiếu nội dung câu hỏi.');

    // Options: A..E, contiguous, at least two.
    const options: { label: string; text: string }[] = [];
    let seenGap: string | null = null;
    for (const label of OPTION_LABELS) {
      const text = get(`option_${label.toLowerCase()}`);
      if (!text) {
        seenGap ??= label;
        continue;
      }
      if (seenGap) {
        fail(
          `option_${label.toLowerCase()}`,
          `Đáp án ${label} có nội dung nhưng đáp án ${seenGap} đang trống.`,
        );
        break;
      }
      options.push({ label, text });
    }
    if (options.length < 2) fail('option_a', 'Cần ít nhất 2 đáp án (option_a, option_b).');

    // Correct answer: exactly one letter that exists.
    const correctTokens = get('correct_answer')
      .toUpperCase()
      .split(/[\s,;]+/)
      .filter(Boolean);
    let correctLabel = '';
    if (correctTokens.length === 0) {
      fail('correct_answer', 'Thiếu đáp án đúng.');
    } else if (correctTokens.length > 1) {
      fail('correct_answer', 'Hiện chỉ hỗ trợ 1 đáp án đúng cho mỗi câu.');
    } else {
      correctLabel = correctTokens[0];
      if (!options.some((o) => o.label === correctLabel)) {
        fail('correct_answer', `Đáp án đúng "${correctLabel}" không khớp đáp án nào có nội dung.`);
      }
    }

    // Difficulty: optional, defaults to MEDIUM (the questions.difficulty column is NOT NULL).
    const difficultyRaw = get('difficulty').toUpperCase();
    let difficulty = QuestionDifficulty.MEDIUM;
    if (difficultyRaw) {
      if (Object.values(QuestionDifficulty).includes(difficultyRaw as QuestionDifficulty)) {
        difficulty = difficultyRaw as QuestionDifficulty;
      } else {
        fail('difficulty', 'Độ khó chỉ nhận EASY, MEDIUM hoặc HARD.');
      }
    }

    // KC names: required, separated by ';'. Normalised (NFC, collapsed spaces) and de-duplicated.
    const seenKc = new Set<string>();
    const kcNames: string[] = [];
    for (const name of get('kc_name').split(';')) {
      const display = name.normalize('NFC').replace(/\s+/g, ' ').trim();
      const key = normalizeKey(display);
      if (display && !seenKc.has(key)) {
        seenKc.add(key);
        kcNames.push(display);
      }
    }
    if (kcNames.length === 0) fail('kc_name', 'Thiếu tên KC (Knowledge Component).');

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    rows.push({
      rowNumber: r,
      questionText,
      options,
      correctLabel,
      difficulty,
      explanation: get('explanation') || null,
      kcNames,
    });
  }

  if (totalRows === 0) return fatal('File không có dòng câu hỏi nào.');
  return { rows, errors, totalRows };
}