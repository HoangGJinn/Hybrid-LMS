import ExcelJS from 'exceljs';
import {
  applyBorders,
  formatExportDateTime,
  setColumnWidths,
  styleHeaderRow,
} from '../../../shared/excel/workbook.util.js';

export type AssignmentResultStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'GRADED';

/** One student's outcome for the exported assignment; students who did not submit still get a row. */
export interface AssignmentExportRow {
  readonly studentCode: string;
  readonly fullName: string;
  readonly email: string;
  readonly status: AssignmentResultStatus;
  readonly submittedAt: Date | null;
  readonly isLate: boolean;
  readonly fileCount: number;
  readonly score: number | null;
  readonly comment: string | null;
  readonly gradedAt: Date | null;
}

const SCORE_FORMAT = '0.00';
const MAX_SCORE = 10;
const RESULT_HEADER_ROW = 1;

const RESULT_HEADERS = [
  'Student Code',
  'Full Name',
  'Email',
  'Status',
  'Submitted At',
  'Late',
  'Files',
  `Score (/${MAX_SCORE})`,
  'Graded At',
  'Feedback Comment',
] as const;

const RESULT_WIDTHS = [14, 28, 32, 16, 18, 8, 8, 12, 18, 44] as const;
const SCORE_COLUMN = 8;
const COMMENT_COLUMN = 10;

const lateLabel = (row: AssignmentExportRow): string => {
  if (row.status === 'NOT_SUBMITTED') return '';
  return row.isLate ? 'Yes' : 'No';
};

const buildResultSheet = (workbook: ExcelJS.Workbook, rows: readonly AssignmentExportRow[]): void => {
  const sheet = workbook.addWorksheet('Results');
  const header = sheet.getRow(RESULT_HEADER_ROW);
  header.values = [...RESULT_HEADERS];
  styleHeaderRow(header);

  rows.forEach((row) => {
    sheet.addRow([
      row.studentCode,
      row.fullName,
      row.email,
      row.status,
      formatExportDateTime(row.submittedAt),
      lateLabel(row),
      row.status === 'NOT_SUBMITTED' ? '' : row.fileCount,
      row.score,
      formatExportDateTime(row.gradedAt),
      row.comment ?? '',
    ]);
  });

  const lastRow = RESULT_HEADER_ROW + rows.length;
  applyBorders(sheet, RESULT_HEADER_ROW + 1, lastRow, 1, RESULT_HEADERS.length);
  sheet.getColumn(SCORE_COLUMN).numFmt = SCORE_FORMAT;
  sheet.getColumn(COMMENT_COLUMN).alignment = { vertical: 'top', wrapText: true };
  setColumnWidths(sheet, RESULT_WIDTHS);
  sheet.views = [{ state: 'frozen', ySplit: RESULT_HEADER_ROW, xSplit: 2 }];
  sheet.autoFilter = {
    from: { row: RESULT_HEADER_ROW, column: 1 },
    to: { row: RESULT_HEADER_ROW, column: RESULT_HEADERS.length },
  };
};

/** One sheet, one row per student, laid out like the exam results export. */
export const buildAssignmentWorkbook = async (
  rows: readonly AssignmentExportRow[],
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  buildResultSheet(workbook, rows);
  return Buffer.from(await workbook.xlsx.writeBuffer());
};