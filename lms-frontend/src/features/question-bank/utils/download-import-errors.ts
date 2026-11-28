import type { ImportBatch } from '../types/question-bank.types';

/** A cell starting with = + - @ would run as a formula when the CSV is opened in Excel, so it gets a leading quote. */
const toCell = (value: string): string => {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** Saves the batch's row errors as a CSV file. The BOM makes Excel read the Vietnamese text as UTF-8. */
export const downloadImportErrors = (batch: ImportBatch): void => {
  const rows = [
    ['Row', 'Field', 'Message'],
    ...(batch.errorReport ?? []).map((e) => [
      String(e.row),
      e.field ?? '',
      e.message,
    ]),
  ];
  const csv = rows.map((r) => r.map(toCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `import-errors-${batch.id}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};