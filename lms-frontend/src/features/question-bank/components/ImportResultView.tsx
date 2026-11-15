import { Download } from 'lucide-react';
import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/utils/cn';
import { downloadImportErrors } from '../utils/download-import-errors';
import { formatDateTime } from '../utils/format-date';
import { BatchStatusPill } from './BatchStatusPill';
import type {
  ImportBatch,
  ImportBatchStatus,
} from '../types/question-bank.types';

const TITLE: Record<ImportBatchStatus, string> = {
  PROCESSING: 'Import in progress',
  COMPLETED: 'Import completed',
  PARTIAL: 'Import finished with some problems',
  FAILED: 'Import failed',
};

interface ImportResultViewProps {
  batch: ImportBatch;
  /** Shown under the title. Falls back to the batch's file name, then a generic label. */
  fileLabel?: string;
  onClose: () => void;
  onViewQuestions: () => void;
  /** Only passed right after an import, so "Import another file" is not offered when browsing history. */
  onImportAnother?: () => void;
}

const Stat = ({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) => (
  <div className={cn('rounded-lg border p-3', className)}>
    <p className="m-0 text-xs">{label}</p>
    <p className="m-0 mt-1 text-2xl font-bold">{value}</p>
  </div>
);

export const ImportResultView = ({
  batch,
  fileLabel,
  onClose,
  onViewQuestions,
  onImportAnother,
}: ImportResultViewProps) => {
  const errors = batch.errorReport ?? [];
  const label = fileLabel ?? batch.fileName ?? 'Excel import';

  return (
    <Modal open title={TITLE[batch.status]} size="lg" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <BatchStatusPill status={batch.status} />
          <span className="text-sm text-muted-foreground">
            {label} · {formatDateTime(batch.createdAt)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Rows in file" value={batch.totalRows} />
          <Stat
            label="Imported"
            value={batch.successRows}
            className="border-success/40 bg-success/10 text-success"
          />
          <Stat
            label="Failed"
            value={batch.failedRows}
            className={
              batch.failedRows > 0
                ? 'border-destructive/40 bg-destructive/5 text-destructive'
                : undefined
            }
          />
        </div>

        {errors.length > 0 && (
          <section className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between gap-3 border-b bg-muted px-4 py-2">
              <h3 className="m-0 text-sm font-semibold">
                Rows that were not imported
              </h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => downloadImportErrors(batch)}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Download as CSV
              </Button>
            </div>
            <ul className="m-0 max-h-64 list-none overflow-y-auto p-0">
              {errors.map((e, i) => (
                <li
                  key={`${e.row}-${e.field ?? ''}-${i}`}
                  className="grid grid-cols-[4.5rem_1fr] gap-3 border-b px-4 py-3 last:border-b-0"
                >
                  <span className="self-start rounded bg-muted px-2 py-0.5 text-center text-xs font-semibold">
                    {e.row === 0 ? 'File' : `Row ${e.row}`}
                  </span>
                  <span className="min-w-0 text-sm">
                    {e.field && (
                      <span className="block text-xs font-semibold text-muted-foreground">
                        {e.field}
                      </span>
                    )}
                    {e.message}
                    {e.field === 'kc_name' && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        The name must match a knowledge component of this
                        subject.
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {batch.status === 'PARTIAL' && (
          <p className="m-0 rounded-lg bg-primary/15 p-3 text-sm text-brand">
            Fix those rows in your file and import it again. The{' '}
            {batch.successRows} questions already imported are skipped as
            duplicates, so nothing is added twice.
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {onImportAnother && (
            <Button type="button" variant="outline" onClick={onImportAnother}>
              Import another file
            </Button>
          )}
          <Button type="button" onClick={onViewQuestions}>
            View imported questions
          </Button>
        </div>
      </div>
    </Modal>
  );
};