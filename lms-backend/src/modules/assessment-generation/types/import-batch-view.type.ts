import type { ImportBatchStatus } from '../enums/import-batch-status.enum.js';

/** One import batch as the API returns it. `fileName` is null when the file record was deleted. */
export interface ImportBatchView {
  id: string;
  subjectId: string;
  uploadedBy: string;
  fileId: string;
  fileName: string | null;
  status: ImportBatchStatus;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errorReport: Record<string, any>[] | null;
  createdAt: Date;
}