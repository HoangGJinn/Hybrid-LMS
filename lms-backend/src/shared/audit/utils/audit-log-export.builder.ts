import ExcelJS from 'exceljs';
import {
  applyBorders,
  formatExportDateTime,
  setColumnWidths,
  styleHeaderRow,
} from '../../excel/workbook.util.js';
import type { AuditLog } from '../entities/audit-log.entity.js';

const HEADER_ROW = 1;

const HEADERS = [
  'Time',
  'Actor Name',
  'Actor Email',
  'Actor Role',
  'Category',
  'Action',
  'Result',
  'Entity Type',
  'Target',
  'Summary',
  'IP Address',
  'Request ID',
  'Changes',
] as const;

const WIDTHS = [18, 24, 28, 12, 12, 26, 10, 14, 30, 44, 16, 22, 40] as const;

export const buildAuditLogsWorkbook = async (
  rows: readonly AuditLog[],
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Audit Logs');
  const header = sheet.getRow(HEADER_ROW);
  header.values = [...HEADERS];
  styleHeaderRow(header);

  for (const row of rows) {
    sheet.addRow([
      formatExportDateTime(row.occurredAt),
      row.actorName ?? '',
      row.actorEmail ?? '',
      row.actorRole ?? '',
      row.category,
      row.action,
      row.result,
      row.entityType,
      row.entityLabel ?? row.entityId ?? '',
      row.summary ?? '',
      row.ipAddress ?? '',
      row.requestId ?? '',
      row.changes ? JSON.stringify(row.changes) : '',
    ]);
  }

  applyBorders(
    sheet,
    HEADER_ROW + 1,
    HEADER_ROW + rows.length,
    1,
    HEADERS.length,
  );
  setColumnWidths(sheet, WIDTHS);
  sheet.views = [{ state: 'frozen', ySplit: HEADER_ROW, xSplit: 1 }];
  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW, column: HEADERS.length },
  };

  return Buffer.from(await workbook.xlsx.writeBuffer());
};
