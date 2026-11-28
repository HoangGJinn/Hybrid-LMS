import type { Borders, Row, Worksheet } from 'exceljs';
import type { Response } from 'express';

export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** A generated workbook together with the name the browser should save it under. */
export interface ExportedFile {
  readonly fileName: string;
  readonly buffer: Buffer;
}

/** Vietnamese lecturers read these files, so timestamps are shown in local time whatever the server clock says. */
const EXPORT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const BORDER_COLOR = 'FFBFBFBF';
const HEADER_ROW_HEIGHT = 28;

/** Characters that are not allowed in file names on common operating systems. */
const UNSAFE_NAME_CHARS = /[\\/:*?"<>|]+/g;

const thinBorders = (): Partial<Borders> => {
  const side = { style: 'thin', color: { argb: BORDER_COLOR } } as const;
  return { top: side, left: side, bottom: side, right: side };
};

/** `dd/MM/yyyy HH:mm` in Vietnam time, or an empty string when there is no date. */
export const formatExportDateTime = (date: Date | null | undefined): string => {
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: EXPORT_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`;
};

export const safeFileName = (name: string): string =>
  name.replace(UNSAFE_NAME_CHARS, '_').trim() || 'export';

/** Bold, centred header cells with a border (white background, black text), optionally limited to a column range. */
export const styleHeaderRow = (
  row: Row,
  fromColumn = 1,
  toColumn = row.cellCount,
): void => {
  for (let column = fromColumn; column <= toColumn; column++) {
    const cell = row.getCell(column);
    cell.font = { bold: true };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = thinBorders();
  }
  row.height = HEADER_ROW_HEIGHT;
};

/** Thin grey borders around every cell of the rectangle (all indexes are 1-based and inclusive). */
export const applyBorders = (
  sheet: Worksheet,
  fromRow: number,
  toRow: number,
  fromColumn: number,
  toColumn: number,
): void => {
  for (let rowIndex = fromRow; rowIndex <= toRow; rowIndex++) {
    for (let columnIndex = fromColumn; columnIndex <= toColumn; columnIndex++) {
      sheet.getCell(rowIndex, columnIndex).border = thinBorders();
    }
  }
};

/** Sets the width of the first columns, one entry per column. */
export const setColumnWidths = (
  sheet: Worksheet,
  widths: readonly number[],
): void => {
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
};

/**
 * Sends the workbook as a download. The handler writes to `response` itself so that the global
 * `ResponseInterceptor` does not wrap the bytes in its JSON envelope.
 */
export const sendXlsx = (response: Response, file: ExportedFile): void => {
  response.set({
    'Content-Type': XLSX_MIME,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    'Content-Length': String(file.buffer.length),
  });
  response.end(file.buffer);
};