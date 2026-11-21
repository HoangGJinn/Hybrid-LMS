import ExcelJS from 'exceljs';
import {
  applyBorders,
  formatExportDateTime,
  setColumnWidths,
  styleHeaderRow,
} from '../../../shared/excel/workbook.util.js';
import type {
  GradeColumnView,
  GradeRowView,
  GradebookSummaryView,
} from '../types/gradebook.types.js';
import { average } from './gradebook.calculator.js';

export interface GradebookExportData {
  readonly classCode: string;
  readonly exportedAt: Date;
  readonly columns: readonly GradeColumnView[];
  readonly rows: readonly GradeRowView[];
  readonly summary: GradebookSummaryView;
}

const FIXED_HEADERS = ['STT', 'MSSV', 'Họ và tên'] as const;
const FIXED_WIDTHS = [6, 14, 28] as const;
const FIXED_COLUMN_COUNT = FIXED_HEADERS.length;
const SCORE_COLUMN_WIDTH = 14;
const AVERAGE_COLUMN_WIDTH = 16;
const SCORE_FORMAT = '0.00';
const TITLE_ROW = 1;
const NOTE_ROW = 2;
const SECTION_ROW = 4;
const LABEL_ROW = 5;
const NAME_ROW = 6;
const FIRST_DATA_ROW = 7;

const scoreOf = (row: GradeRowView, column: GradeColumnView): number | null =>
  row.scores[column.id] ?? null;

/** Merges the section header over each run of neighbouring columns that belong to the same section. */
const writeSectionHeaders = (
  sheet: ExcelJS.Worksheet,
  columns: readonly GradeColumnView[],
): void => {
  let start = 0;
  while (start < columns.length) {
    let end = start;
    while (
      end + 1 < columns.length &&
      columns[end + 1].sectionId === columns[start].sectionId
    ) {
      end++;
    }
    const firstColumn = FIXED_COLUMN_COUNT + 1 + start;
    const lastColumn = FIXED_COLUMN_COUNT + 1 + end;
    sheet.getCell(SECTION_ROW, firstColumn).value = columns[start].sectionName;
    if (lastColumn > firstColumn) {
      sheet.mergeCells(SECTION_ROW, firstColumn, SECTION_ROW, lastColumn);
    }
    start = end + 1;
  }
};

/**
 * One sheet laid out like the grades tab: a row per student, a column per assignment / exam
 * (grouped by section) and the two averages. Empty cells mean "no score yet".
 */
export const buildGradebookWorkbook = async (
  data: GradebookExportData,
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Bảng điểm');

  const processColumn = FIXED_COLUMN_COUNT + data.columns.length + 1;
  const testColumn = processColumn + 1;
  const lastColumn = testColumn;
  const lastDataRow = FIRST_DATA_ROW + data.rows.length - 1;
  const summaryRow = lastDataRow + 1;

  sheet.getCell(TITLE_ROW, 1).value = `BẢNG ĐIỂM LỚP ${data.classCode}`;
  sheet.getCell(TITLE_ROW, 1).font = { bold: true, size: 14 };
  sheet.getCell(NOTE_ROW, 1).value =
    `Thang điểm 10 · Ô trống là chưa có điểm · Xuất lúc ${formatExportDateTime(data.exportedAt)}`;
  sheet.getCell(NOTE_ROW, 1).font = { italic: true };

  // Headers: three stacked rows (section / label / full name), fixed and average columns span all three.
  FIXED_HEADERS.forEach((header, index) => {
    sheet.getCell(SECTION_ROW, index + 1).value = header;
    sheet.mergeCells(SECTION_ROW, index + 1, NAME_ROW, index + 1);
  });
  writeSectionHeaders(sheet, data.columns);
  data.columns.forEach((column, index) => {
    const columnIndex = FIXED_COLUMN_COUNT + 1 + index;
    sheet.getCell(LABEL_ROW, columnIndex).value = column.label;
    sheet.getCell(NAME_ROW, columnIndex).value = column.title;
  });
  sheet.getCell(SECTION_ROW, processColumn).value = 'TB quá trình';
  sheet.mergeCells(SECTION_ROW, processColumn, NAME_ROW, processColumn);
  sheet.getCell(SECTION_ROW, testColumn).value = 'TB kiểm tra';
  sheet.mergeCells(SECTION_ROW, testColumn, NAME_ROW, testColumn);
  for (const rowIndex of [SECTION_ROW, LABEL_ROW, NAME_ROW]) {
    styleHeaderRow(sheet.getRow(rowIndex), 1, lastColumn);
  }

  data.rows.forEach((row, index) => {
    const excelRow = sheet.getRow(FIRST_DATA_ROW + index);
    excelRow.getCell(1).value = index + 1;
    excelRow.getCell(2).value = row.studentCode;
    excelRow.getCell(3).value = row.fullName;
    data.columns.forEach((column, columnIndex) => {
      excelRow.getCell(FIXED_COLUMN_COUNT + 1 + columnIndex).value = scoreOf(
        row,
        column,
      );
    });
    for (const [columnIndex, value] of [
      [processColumn, row.processAvg],
      [testColumn, row.testAvg],
    ] as const) {
      excelRow.getCell(columnIndex).value =
        value === null ? null : Math.round(value * 100) / 100;
    }
  });

  // Class average per column (only scores that exist), so the lecturer sees how each item went.
  const summary = sheet.getRow(summaryRow);
  summary.getCell(3).value = 'Trung bình lớp';
  data.columns.forEach((column, index) => {
    const value = average(data.rows.map((row) => scoreOf(row, column)));
    summary.getCell(FIXED_COLUMN_COUNT + 1 + index).value =
      value === null ? null : Math.round(value * 100) / 100;
  });
  summary.getCell(processColumn).value =
    data.summary.processAvg === null
      ? null
      : Math.round(data.summary.processAvg * 100) / 100;
  summary.getCell(testColumn).value =
    data.summary.testAvg === null
      ? null
      : Math.round(data.summary.testAvg * 100) / 100;
  for (let columnIndex = 1; columnIndex <= lastColumn; columnIndex++) {
    summary.getCell(columnIndex).font = { bold: true };
  }

  applyBorders(sheet, FIRST_DATA_ROW, summaryRow, 1, lastColumn);
  for (
    let columnIndex = FIXED_COLUMN_COUNT + 1;
    columnIndex <= lastColumn;
    columnIndex++
  ) {
    const column = sheet.getColumn(columnIndex);
    column.numFmt = SCORE_FORMAT;
    column.alignment = { horizontal: 'center' };
  }
  setColumnWidths(sheet, [
    ...FIXED_WIDTHS,
    ...data.columns.map(() => SCORE_COLUMN_WIDTH),
    AVERAGE_COLUMN_WIDTH,
    AVERAGE_COLUMN_WIDTH,
  ]);
  sheet.views = [
    { state: 'frozen', xSplit: FIXED_COLUMN_COUNT, ySplit: NAME_ROW },
  ];

  return Buffer.from(await workbook.xlsx.writeBuffer());
};