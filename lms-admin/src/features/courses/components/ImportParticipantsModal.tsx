import { useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { getErrorMessage } from '@/core/api/errors';
import { Modal } from '@/shared/components/Modal';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { downloadCsv } from '@/shared/utils/download';
import { useImportParticipants } from '../hooks/useParticipants';
import type {
  ClassView,
  ImportResult,
  ImportRowPayload,
  ImportRowResult,
} from '../types/courses.types';
import {
  IMPORT_TEMPLATE_CSV,
  MAX_IMPORT_ROWS,
  parseParticipantCsv,
} from '../utils/participant-csv';

/** Larger files are certainly not a roster; reading them would only freeze the page. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_LISTED_PROBLEMS = 100;

interface ImportParticipantsModalProps {
  open: boolean;
  course: ClassView;
  onClose: () => void;
}

const ERROR_BOX =
  'm-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive';

const pluralize = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? '' : 's'}`;

const ProblemRow = ({ row }: { row: ImportRowResult }) => (
  <tr className="align-top">
    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
      {row.line}
    </td>
    <td className="px-3 py-2">
      {row.fullName ?? row.studentCode ?? '—'}
      {row.fullName && row.studentCode && (
        <span className="block text-xs text-muted-foreground">
          {row.studentCode}
        </span>
      )}
    </td>
    <td className="px-3 py-2">
      <Badge variant={row.status === 'error' ? 'destructive' : 'default'}>
        {row.status === 'error' ? 'Error' : 'Skipped'}
      </Badge>
      {row.message && <span className="ml-2">{row.message}</span>}
    </td>
  </tr>
);

const ImportBody = ({
  course,
  onClose,
}: {
  course: ClassView;
  onClose: () => void;
}) => {
  const [rows, setRows] = useState<ImportRowPayload[] | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending, variables } = useImportParticipants(course.id);
  const isChecking = isPending && variables?.dryRun === true;
  const isImporting = isPending && variables?.dryRun === false;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    setRows(null);
    setPreview(null);
    setError(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError('This file is too large. Use a CSV file of at most 2 MB.');
      input.value = '';
      return;
    }

    const parsed = parseParticipantCsv(await file.text());
    // Lets the same file be picked again after it has been corrected.
    input.value = '';
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
          toast.success(
            `${pluralize(result.added, 'participant')} added to ${course.classCode}.`,
          );
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
        <span className="font-semibold text-foreground">{course.classCode}</span>{' '}
        at once from a CSV file. Each row needs a “Student Code” or an “Email”
        (up to {MAX_IMPORT_ROWS} rows). A file exported from this page can be
        imported again.
      </p>

      <div className="space-y-2">
        <label htmlFor="import-file" className="block text-xs font-semibold">
          CSV file
        </label>
        <input
          id="import-file"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void handleFile(event)}
          disabled={isImporting}
          className="block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            downloadCsv(IMPORT_TEMPLATE_CSV, 'participants-template.csv')
          }
        >
          <Download className="h-4 w-4" />
          Download template
        </Button>
      </div>

      {isChecking && (
        <p className="m-0 text-sm text-muted-foreground" role="status">
          Checking the file…
        </p>
      )}

      {preview && (
        <div className="space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="success">{preview.added} to add</Badge>
            <Badge>{preview.skipped} skipped</Badge>
            <Badge variant={preview.failed > 0 ? 'destructive' : 'default'}>
              {pluralize(preview.failed, 'error')}
            </Badge>
            <span className="text-muted-foreground">
              in {pluralize(preview.total, 'row')}
            </span>
          </div>
          {problems.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b bg-muted/80 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Row
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Student
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Result
                    </th>
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
              Showing the first {MAX_LISTED_PROBLEMS} of {problems.length} rows
              that need attention.
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
          disabled={!preview || preview.added === 0 || isChecking}
          isLoading={isImporting}
        >
          {preview && preview.added > 0
            ? `Import ${pluralize(preview.added, 'participant')}`
            : 'Import'}
        </Button>
      </div>
    </div>
  );
};

/** Bulk "Add Participant" from a CSV file, with a preview of the outcome before anything is written. */
export const ImportParticipantsModal = ({
  open,
  course,
  onClose,
}: ImportParticipantsModalProps) => (
  <Modal open={open} title="Import participants" size="lg" onClose={onClose}>
    {/* Mounted only while open, so every opening starts without a file or a preview. */}
    {open && <ImportBody course={course} onClose={onClose} />}
  </Modal>
);
