import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@core/api/errors';
import { CsvFilePicker } from '@shared/components/CsvFilePicker';
import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/utils/cn';
import { readCsvFile } from '@shared/utils/csv';
import { useImportParticipants } from '../hooks/useImportParticipants';
import type {
  ImportResult,
  ImportRowPayload,
  ImportRowResult,
} from '../types/participant-management.types';
import {
  IMPORT_TEMPLATE_CSV,
  MAX_IMPORT_ROWS,
  parseParticipantCsv,
} from '../utils/participant-csv';

const MAX_LISTED_PROBLEMS = 100;

const ERROR_BOX =
  'm-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive';

const pluralize = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? '' : 's'}`;

type Tone = 'default' | 'success' | 'destructive';

const TONE_CLASS: Record<Tone, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-success/15 text-success',
  destructive: 'bg-destructive/10 text-destructive',
};

const Pill = ({ tone = 'default', children }: { tone?: Tone; children: string }) => (
  <span
    className={cn(
      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
      TONE_CLASS[tone],
    )}
  >
    {children}
  </span>
);

const ProblemRow = ({ row }: { row: ImportRowResult }) => (
  <tr className="align-top">
    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{row.line}</td>
    <td className="px-3 py-2">
      {row.fullName ?? row.studentCode ?? '—'}
      {row.fullName && row.studentCode && (
        <span className="block text-xs text-muted-foreground">{row.studentCode}</span>
      )}
    </td>
    <td className="px-3 py-2">
      <Pill tone={row.status === 'error' ? 'destructive' : 'default'}>
        {row.status === 'error' ? 'Error' : 'Skipped'}
      </Pill>
      {row.message && <span className="ml-2">{row.message}</span>}
    </td>
  </tr>
);

const ImportBody = ({
  classId,
  classCode,
  onClose,
}: {
  classId: string;
  classCode: string;
  onClose: () => void;
}) => {
  const [rows, setRows] = useState<ImportRowPayload[] | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending, variables } = useImportParticipants(classId);
  const isChecking = isPending && variables?.dryRun === true;
  const isImporting = isPending && variables?.dryRun === false;

  const handleFile = async (file: File) => {
    setRows(null);
    setPreview(null);
    setError(null);
    const read = await readCsvFile(file);
    if (read.error !== null) {
      setError(read.error);
      return;
    }
    const parsed = parseParticipantCsv(read.text);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    setRows(parsed.rows);
    mutate(
      { rows: parsed.rows, dryRun: true },
      { onSuccess: setPreview, onError: (err) => setError(getErrorMessage(err)) },
    );
  };

  const handleImport = () => {
    if (!rows) return;
    setError(null);
    mutate(
      { rows, dryRun: false },
      {
        onSuccess: (result) => {
          toast.success(`${pluralize(result.added, 'participant')} added to ${classCode}.`);
          onClose();
        },
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  const problems = preview?.rows.filter((row) => row.status !== 'added') ?? [];

  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-muted-foreground">
        Add many students to{' '}
        <span className="font-semibold text-foreground">{classCode}</span> at once from a
        CSV file. Each row needs a “Student Code” or an “Email” (up to {MAX_IMPORT_ROWS}{' '}
        rows). A file exported from this page can be imported again.
      </p>

      <CsvFilePicker
        ariaLabel="CSV file"
        pickLabel="Choose CSV file"
        templateCsv={IMPORT_TEMPLATE_CSV}
        templateFileName="participants-template.csv"
        disabled={isImporting}
        onPickFile={(file) => void handleFile(file)}
      />

      {isChecking && (
        <p className="m-0 text-sm text-muted-foreground" role="status">
          Checking the file…
        </p>
      )}

      {preview && (
        <div className="space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Pill tone="success">{`${preview.added} to add`}</Pill>
            <Pill>{`${preview.skipped} skipped`}</Pill>
            <Pill tone={preview.failed > 0 ? 'destructive' : 'default'}>
              {pluralize(preview.failed, 'error')}
            </Pill>
            <span className="text-muted-foreground">in {pluralize(preview.total, 'row')}</span>
          </div>
          {problems.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b bg-muted/80 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2">Row</th>
                    <th scope="col" className="px-3 py-2">Student</th>
                    <th scope="col" className="px-3 py-2">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {problems.slice(0, MAX_LISTED_PROBLEMS).map((row) => (
                    <ProblemRow key={row.line} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {problems.length > MAX_LISTED_PROBLEMS && (
            <p className="m-0 text-xs text-muted-foreground">
              Showing the first {MAX_LISTED_PROBLEMS} of {problems.length} rows that need
              attention.
            </p>
          )}
          {preview.added === 0 && (
            <p className="m-0 text-sm text-muted-foreground">
              There is nothing to add from this file.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className={ERROR_BOX}>
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isImporting}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={!preview || preview.added === 0 || isChecking || isImporting}
        >
          {isImporting
            ? 'Importing…'
            : preview && preview.added > 0
              ? `Import ${pluralize(preview.added, 'participant')}`
              : 'Import'}
        </Button>
      </div>
    </div>
  );
};

interface ImportParticipantsModalProps {
  open: boolean;
  classId: string;
  classCode: string;
  onClose: () => void;
}

/** Bulk add from a CSV file, with a preview of the outcome before anything is written. Same flow as the admin app. */
export const ImportParticipantsModal = ({
  open,
  classId,
  classCode,
  onClose,
}: ImportParticipantsModalProps) => (
  <Modal open={open} title="Import participants" size="lg" onClose={onClose}>
    {/* Mounted only while open, so every opening starts without a file or a preview. */}
    {open && <ImportBody classId={classId} classCode={classCode} onClose={onClose} />}
  </Modal>
);
