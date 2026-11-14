import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Paperclip,
  Trash2,
  Upload,
} from 'lucide-react';
import { FilePreviewModal } from '@shared/components/file-preview';
import { PageHeader } from '@shared/components/PageHeader';
import { Button } from '@shared/components/ui/button';
import { useCountdown } from '@shared/hooks/useCountdown';
import { cn } from '@shared/utils/cn';
import { formatDateTime, pad } from '@shared/utils/format';
import { useExamAutosave } from '../hooks/useExamAutosave';
import { useSaveFileExamSubmission } from '../hooks/useExamSession';
import type { ExamAttempt, ExamFileLink } from '../types/exams.types';

const MAX_FILES = 10;
const ACCEPTED_EXTENSIONS =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.py,.c,.cpp,.h,.java,.js,.css';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

interface FileExamWorkspaceProps {
  attempt: ExamAttempt;
  onExitToLobby: () => void;
}

export const FileExamWorkspace = ({
  attempt,
  onExitToLobby,
}: FileExamWorkspaceProps) => {
  const { session, exam, questionFile } = attempt;
  const [keptFiles, setKeptFiles] = useState<ExamFileLink[]>(
    () => attempt.submittedFiles ?? [],
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [submittedAt, setSubmittedAt] = useState<string | null>(
    () => session.submittedAt ?? null,
  );
  const [previewQuestionOpen, setPreviewQuestionOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const expiredHandledRef = useRef(false);

  // Reuse useExamAutosave for 15-second + focus/visibility deadline sync when lecturer extends time.
  const { deadlineMs } = useExamAutosave({
    sessionId: session.id,
    initialSavedAnswers: {},
    initialDeadlineIso: attempt.deadline,
    initialServerNowIso: attempt.serverNow,
  });

  const cd = useCountdown(deadlineMs);
  const saveMutation = useSaveFileExamSubmission();

  useEffect(() => {
    if (!cd.expired || expiredHandledRef.current) return;
    expiredHandledRef.current = true;
    toast.info('Time is up — your exam attempt has been finalized.');
    onExitToLobby();
  }, [cd.expired, onExitToLobby]);

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (selected.length === 0) return;
    const totalCount = keptFiles.length + newFiles.length + selected.length;
    if (totalCount > MAX_FILES) {
      toast.error(`You can attach at most ${MAX_FILES} files.`);
      return;
    }
    setNewFiles((prev) => [...prev, ...selected]);
  };

  const handleRemoveKeptFile = (fileId: string) => {
    setKeptFiles((prev) => prev.filter((item) => item.fileId !== fileId));
  };

  const handleRemoveNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveSubmission = () => {
    const totalFiles = keptFiles.length + newFiles.length;
    if (totalFiles === 0) {
      toast.error('Please attach at least one file before submitting.');
      return;
    }
    saveMutation.mutate(
      {
        sessionId: session.id,
        keptFileIds: keptFiles.map((item) => item.fileId),
        newFiles,
      },
      {
        onSuccess: (res) => {
          setKeptFiles(res.submittedFiles);
          setNewFiles([]);
          setSubmittedAt(res.submittedAt);
          toast.success(
            submittedAt
              ? 'Submission updated! You can continue editing while time remains.'
              : 'Exam files submitted! You can still edit or replace them while time remains.',
          );
        },
        onError: (err) => {
          toast.error(err.message || 'Could not save your submission.');
        },
      },
    );
  };

  const low = cd.ms < 5 * 60 * 1000;
  const totalSelectedCount = keptFiles.length + newFiles.length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={`${exam.examName} (File Exam)`}
        subtitle={
          submittedAt
            ? `Last submitted ${formatDateTime(submittedAt)} · Editable until timer expires`
            : 'Download the question paper, complete your work, and upload your submission before time runs out'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onExitToLobby}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Overview
            </Button>
            <div
              role="timer"
              aria-label="Time remaining"
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-4 py-2 font-mono text-xl font-bold',
                low ? 'border-destructive text-destructive' : 'text-brand',
              )}
            >
              <Clock className="h-4 w-4" />
              {pad(cd.hours + cd.days * 24)}:{pad(cd.minutes)}:{pad(cd.seconds)}
            </div>
          </div>
        }
      />

      {/* Step 1: Question File */}
      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2.5 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="m-0 text-base font-semibold">
                1. Exam Question Paper
              </h2>
              {questionFile ? (
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  {questionFile.fileName} ({formatFileSize(questionFile.size)})
                </p>
              ) : (
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  No question file attached to this exam.
                </p>
              )}
            </div>
          </div>
          {questionFile && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewQuestionOpen(true)}
              >
                <Eye className="mr-1.5 h-4 w-4" />
                Preview question paper
              </Button>
              <Button asChild variant="outline">
                <a
                  href={questionFile.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download question paper
                </a>
              </Button>
            </div>
          )}
        </div>
      </section>

      {questionFile && (
        <FilePreviewModal
          open={previewQuestionOpen}
          files={[
            {
              fileId: questionFile.fileId,
              fileName: questionFile.fileName,
              fileUrl: questionFile.downloadUrl,
              size: questionFile.size,
            },
          ]}
          title={`Question Paper — ${questionFile.fileName}`}
          onClose={() => setPreviewQuestionOpen(false)}
        />
      )}

      {/* Step 2: Student File Submission */}
      <section className="space-y-4 rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="m-0 text-base font-semibold">
              2. Your Answer Submission ({totalSelectedCount} / {MAX_FILES}{' '}
              files)
            </h2>
            <p className="m-0 mt-1 text-xs text-muted-foreground">
              Supported formats: PDF, Word, Excel, PowerPoint, ZIP/RAR/7Z, TXT,
              or source code files.
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={handleSelectFiles}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                saveMutation.isPending || totalSelectedCount >= MAX_FILES
              }
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="mr-1.5 h-4 w-4" />
              Add files
            </Button>
          </div>
        </div>

        {submittedAt && (
          <div className="flex items-start gap-2.5 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="m-0 font-semibold">
                Submitted at {formatDateTime(submittedAt)}
              </p>
              <p className="m-0 mt-0.5 text-xs text-foreground/80">
                Your files are safely recorded. While your exam timer is still
                running, you can add, remove, or replace files below and click{' '}
                <strong>Update submission</strong>.
              </p>
            </div>
          </div>
        )}

        {totalSelectedCount === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:bg-accent/40"
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="m-0 text-sm font-medium">
              Click to select your answer file(s)
            </p>
            <p className="m-0 mt-1 text-xs text-muted-foreground">
              Up to {MAX_FILES} files · Max 100 MB per file
            </p>
          </div>
        ) : (
          <ul className="m-0 divide-y rounded-md border p-0 list-none">
            {keptFiles.map((file) => (
              <li
                key={file.fileId}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-brand" />
                  <a
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground hover:underline"
                  >
                    {file.fileName}
                  </a>
                  <span className="text-xs text-muted-foreground">
                    ({formatFileSize(file.size)})
                  </span>
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                    Uploaded
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={saveMutation.isPending}
                  onClick={() => handleRemoveKeptFile(file.fileId)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Remove
                </Button>
              </li>
            ))}

            {newFiles.map((file, idx) => (
              <li
                key={`${file.name}-${file.size}-${idx}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({formatFileSize(file.size)})
                  </span>
                  <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                    Ready to submit
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={saveMutation.isPending}
                  onClick={() => handleRemoveNewFile(idx)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="m-0 text-xs text-muted-foreground">
            {submittedAt
              ? 'Make any changes above and click Update submission before time runs out.'
              : 'Remember to click Submit exam files after selecting your files.'}
          </p>
          <Button
            type="button"
            disabled={saveMutation.isPending || totalSelectedCount === 0}
            onClick={handleSaveSubmission}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {saveMutation.isPending
              ? 'Uploading & saving…'
              : submittedAt
                ? 'Update submission'
                : 'Submit exam files'}
          </Button>
        </div>
      </section>
    </div>
  );
};

