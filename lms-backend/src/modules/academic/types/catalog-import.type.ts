export type CatalogImportRowStatus = 'created' | 'skipped' | 'error';

/** Outcome of one data row of a subject or semester import file. */
export interface CatalogImportRowResult {
  /** Row number from the file, as sent by the client. */
  line: number;
  /** `created` = will be / was created (depends on `dryRun`), `skipped` = duplicate, `error` = unusable row. */
  status: CatalogImportRowStatus;
  code: string | null;
  name: string | null;
  message: string | null;
}

export interface CatalogImportResult {
  /** true = nothing was written: this is a preview of what the import would do. */
  dryRun: boolean;
  total: number;
  created: number;
  skipped: number;
  failed: number;
  rows: CatalogImportRowResult[];
}
