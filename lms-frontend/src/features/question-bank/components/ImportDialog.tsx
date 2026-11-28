import { useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/utils/cn';
import { useImportQuestions } from '../hooks/useImportQuestions';
import { ImportResultView } from './ImportResultView';
import type { ImportBatch, SubjectOption } from '../types/question-bank.types';

const MAX_BYTES = 5 * 1024 * 1024;
const TEMPLATE_URL = '/templates/question_import_template.xlsx';

const formatSize = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

interface ImportDialogProps {
  subject: SubjectOption;
  onClose: () => void;
  onViewQuestions: (batch: ImportBatch) => void;
}

export const ImportDialog = ({
  subject,
  onClose,
  onViewQuestions,
}: ImportDialogProps) => {
  const importQuestions = useImportQuestions();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ImportBatch | null>(null);
  const importing = importQuestions.isPending;

  const choose = (picked: File | undefined) => {
    if (!picked) return;
    importQuestions.reset();
    if (!picked.name.toLowerCase().endsWith('.xlsx')) {
      setFile(null);
      setFileError('Only .xlsx files are supported.');
    } else if (picked.size > MAX_BYTES) {
      setFile(null);
      setFileError('The file is larger than 5 MB.');
    } else {
      setFile(picked);
      setFileError(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (!importing) choose(e.dataTransfer.files[0]);
  };

  const handleImport = () => {
    if (!file) return;
    importQuestions.mutate(
      { subjectId: subject.id, file },
      {
        onSuccess: (batch) => {
          if (batch.status === 'COMPLETED') {
            toast.success(`Imported ${batch.successRows} questions`);
            onClose();
          } else {
            setResult(batch);
          }
        },
      },
    );
  };

  if (result) {
    return (
      <ImportResultView
        batch={result}
        fileLabel={file?.name}
        onClose={onClose}
        onViewQuestions={() => onViewQuestions(result)}
        onImportAnother={() => {
          setResult(null);
          setFile(null);
        }}
      />
    );
  }

  return (
    <Modal open title="Import questions from Excel" size="lg" onClose={onClose}>
      <div className="space-y-5">
        <p className="m-0 text-sm text-muted-foreground">
          Questions go straight into the bank and are approved automatically.
        </p>

        <p className="m-0 rounded-lg bg-muted p-3 text-sm">
          <span className="text-muted-foreground">Subject </span>
          <strong>
            {subject.subjectCode} · {subject.name}
          </strong>
        </p>

        <div className="space-y-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed p-5 text-center',
              dragging ? 'border-primary bg-primary/15' : 'bg-muted/40',
            )}
          >
            <Upload className="h-7 w-7 text-brand" />
            <p className="m-0 text-sm">
              Drag and drop an <strong>.xlsx</strong> file here, or
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={importing}
              onClick={() => inputRef.current?.click()}
            >
              Browse files
            </Button>
            <p className="m-0 text-xs text-muted-foreground">
              Up to 1,000 questions and 5 MB per file
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                choose(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>

          {fileError && (
            <p role="alert" className="m-0 text-sm text-destructive">
              {fileError}
            </p>
          )}

          {file && (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <FileSpreadsheet className="h-5 w-5 shrink-0 text-success" />
              <span className="min-w-0 flex-1 truncate text-sm">
                <strong>{file.name}</strong>
                <span className="text-muted-foreground">
                  {' '}
                  · {formatSize(file.size)}
                </span>
              </span>
              <button
                type="button"
                aria-label="Remove file"
                disabled={importing}
                onClick={() => setFile(null)}
                className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <section className="rounded-lg border p-3">
          <h3 className="m-0 text-sm font-semibold">
            How your file is checked
          </h3>
          <ul className="m-0 mt-2 space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              Required columns: question_text, option_a, option_b,
              correct_answer, kc_name.
            </li>
            <li>kc_name must match a knowledge component of this subject.</li>
            <li>One correct answer per question. Duplicates are skipped.</li>
            <li>
              Rows with problems are reported by row number. The valid rows are
              still imported.
            </li>
          </ul>
        </section>

        {importQuestions.isError && (
          <p role="alert" className="m-0 text-sm text-destructive">
            {importQuestions.error.message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href={TEMPLATE_URL}
            download
            className="text-sm font-medium text-brand underline"
          >
            Download template
          </a>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={importing}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!file || importing}
              onClick={handleImport}
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : (
                'Import'
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};