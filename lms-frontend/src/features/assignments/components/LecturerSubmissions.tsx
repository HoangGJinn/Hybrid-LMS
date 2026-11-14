import { useEffect, useRef, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Columns2, Download, X } from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import {
  FilePreviewPanel,
  ResizableSplitPane,
  type PreviewableFile,
} from '@shared/components/file-preview';
import { StatusBadge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { toAsyncState } from '@shared/utils/async-state';
import { formatDateTime } from '@shared/utils/format/date';
import {
  useClassSubmissions,
  useDownloadSubmissions,
  useGradeInAssignment,
} from '../hooks/useSubmissionReview';
import type {
  AssignmentDetail,
  AssignmentSubmission,
} from '../types/assignments.types';
import { FileList } from './FileList';

const MAX_SCORE = 10;

const toPreviewFiles = (row: AssignmentSubmission): PreviewableFile[] =>
  row.files.map((file) => ({
    fileId: file.fileId,
    fileName: file.fileName,
    fileUrl: file.downloadUrl,
  }));

/** Lecturer's view of an assignment: who submitted, their work, grading, and downloads. */
export const LecturerSubmissions = ({
  classId,
  assignment,
}: {
  classId: string;
  assignment: AssignmentDetail;
}) => {
  const submissionsQuery = useClassSubmissions(classId, assignment.id);
  const state = toAsyncState(submissionsQuery);
  const download = useDownloadSubmissions();
  const [speedGraderId, setSpeedGraderId] = useState<string | null>(null);

  const downloadZip = (submissionId: string | undefined, fileName: string) =>
    download.mutate(
      { classId, assignmentId: assignment.id, submissionId, fileName },
      { onError: (error) => toast.error(error.message) },
    );

  const rows = submissionsQuery.data ?? [];

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-xl font-medium">Submissions</h2>
        <div className="flex flex-wrap items-center gap-2">
          {rows.length > 0 && (
            <Button
              size="sm"
              onClick={() => {
                const firstUngraded = rows.find((row) => row.score === null);
                setSpeedGraderId(firstUngraded?.id ?? rows[0].id);
              }}
            >
              <Columns2 />
              SpeedGrader
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={assignment.submissionCount === 0 || download.isPending}
            onClick={() =>
              downloadZip(undefined, `${assignment.title}-submissions`)
            }
          >
            <Download />
            {download.isPending ? 'Preparing zip…' : 'Download all (.zip)'}
          </Button>
        </div>
      </div>
      <AsyncView
        state={state}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            title="No submissions yet"
            description="Students' work will appear here."
          />
        }
      >
        {(list) => {
          const graded = list.filter((row) => row.score !== null).length;
          return (
            <>
              <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                <Stat label="Submitted" value={list.length} />
                <Stat label="Graded" value={graded} />
                <Stat label="To grade" value={list.length - graded} />
              </div>
              <ul className="m-0 list-none space-y-3 p-0">
                {list.map((row) => (
                  <SubmissionRow
                    key={row.id}
                    classId={classId}
                    assignmentId={assignment.id}
                    row={row}
                    onOpenSpeedGrader={() => setSpeedGraderId(row.id)}
                    onDownload={() =>
                      downloadZip(
                        row.id,
                        `${row.studentCode || 'student'}-${row.studentName}`,
                      )
                    }
                  />
                ))}
              </ul>
            </>
          );
        }}
      </AsyncView>

      {speedGraderId !== null && rows.length > 0 && (
        <AssignmentSpeedGraderDialog
          classId={classId}
          assignmentId={assignment.id}
          assignmentTitle={assignment.title}
          rows={rows}
          activeSubmissionId={speedGraderId}
          onSelectSubmission={setSpeedGraderId}
          onDownloadZip={(row) =>
            downloadZip(
              row.id,
              `${row.studentCode || 'student'}-${row.studentName}`,
            )
          }
          isDownloadingZip={download.isPending}
          onClose={() => setSpeedGraderId(null)}
        />
      )}
    </section>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border bg-card p-3">
    <p className="m-0 text-2xl font-semibold">{value}</p>
    <p className="m-0 text-xs text-muted-foreground">{label}</p>
  </div>
);

interface SubmissionRowProps {
  classId: string;
  assignmentId: string;
  row: AssignmentSubmission;
  onOpenSpeedGrader: () => void;
  onDownload: () => void;
}

/** One student's submission with its grading form. The parent keys it by submission id, so the form state is per row. */
const SubmissionRow = ({
  classId,
  assignmentId,
  row,
  onOpenSpeedGrader,
  onDownload,
}: SubmissionRowProps) => {
  const grade = useGradeInAssignment();
  const [score, setScore] = useState(row.score?.toString() ?? '');
  const [comment, setComment] = useState(row.comment ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const value = Number(score);
    if (score.trim() === '' || Number.isNaN(value) || value < 0 || value > MAX_SCORE) {
      setError(`The score must be a number from 0 to ${MAX_SCORE}.`);
      return;
    }
    setError(null);
    grade.mutate(
      {
        classId,
        assignmentId,
        submissionId: row.id,
        score: value,
        comment: comment.trim(),
      },
      {
        onSuccess: () => toast.success('Grade saved'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <li className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="m-0 font-semibold">
            {row.studentName}
            {row.studentCode && (
              <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                {row.studentCode}
              </span>
            )}
          </p>
          <p className="m-0 text-xs text-muted-foreground">
            Submitted {formatDateTime(row.submittedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={row.score === null ? 'SUBMITTED' : 'GRADED'} />
          <Button size="sm" variant="outline" onClick={onOpenSpeedGrader}>
            <Columns2 />
            Split-screen Grade
          </Button>
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Download />
            Zip
          </Button>
        </div>
      </div>

      {row.files.length > 0 && <FileList files={row.files} className="mt-3" />}
      {row.answerText && (
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">
          {row.answerText}
        </pre>
      )}

      <form
        onSubmit={save}
        className="mt-4 grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end"
      >
        <div className="space-y-1">
          <Label htmlFor={`score-${row.id}`}>Score (0–{MAX_SCORE})</Label>
          <Input
            id={`score-${row.id}`}
            type="number"
            step="0.25"
            min={0}
            max={MAX_SCORE}
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`comment-${row.id}`}>Feedback</Label>
          <Input
            id={`comment-${row.id}`}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={grade.isPending}>
          {grade.isPending
            ? 'Saving…'
            : row.score === null
              ? 'Submit grade'
              : 'Update grade'}
        </Button>
      </form>
      {error && (
        <p role="alert" className="m-0 mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </li>
  );
};

interface AssignmentSpeedGraderDialogProps {
  classId: string;
  assignmentId: string;
  assignmentTitle: string;
  rows: AssignmentSubmission[];
  activeSubmissionId: string;
  onSelectSubmission: (submissionId: string) => void;
  onDownloadZip: (row: AssignmentSubmission) => void;
  isDownloadingZip: boolean;
  onClose: () => void;
}

const AssignmentSpeedGraderDialog = ({
  classId,
  assignmentId,
  assignmentTitle,
  rows,
  activeSubmissionId,
  onSelectSubmission,
  onDownloadZip,
  isDownloadingZip,
  onClose,
}: AssignmentSpeedGraderDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
  }, []);

  const currentIndex = Math.max(
    0,
    rows.findIndex((row) => row.id === activeSubmissionId),
  );
  const currentRow = rows[currentIndex];
  if (!currentRow) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < rows.length - 1;

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={`SpeedGrader — ${assignmentTitle}`}
      onCancel={(event) => {
        if (document.fullscreenElement) {
          event.preventDefault();
        }
      }}
      onClose={onClose}
      onClick={handleBackdropClick}
      className="m-auto h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[1600px] rounded-2xl border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/60"
    >
      <div className="flex h-full flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              SpeedGrader
            </span>
            <h2 className="m-0 truncate text-sm font-semibold sm:text-base">
              {assignmentTitle}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => hasPrev && onSelectSubmission(rows[currentIndex - 1].id)}
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Prev
            </Button>

            <div className="flex items-center gap-1.5">
              <select
                aria-label="Select submission to grade"
                value={currentRow.id}
                onChange={(e) => onSelectSubmission(e.target.value)}
                className="h-8 max-w-[260px] rounded-md border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.studentName}
                    {row.studentCode ? ` (${row.studentCode})` : ''}
                    {row.score !== null ? ` — ${row.score.toFixed(2)}/${MAX_SCORE}` : ' — Pending'}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">
                ({currentIndex + 1} / {rows.length})
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => hasNext && onSelectSubmission(rows[currentIndex + 1].id)}
            >
              Next
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close SpeedGrader"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <AssignmentSpeedGraderBody
            key={currentRow.id}
            classId={classId}
            assignmentId={assignmentId}
            row={currentRow}
            hasNext={hasNext}
            onAdvanceNext={() =>
              hasNext && onSelectSubmission(rows[currentIndex + 1].id)
            }
            onDownloadZip={() => onDownloadZip(currentRow)}
            isDownloadingZip={isDownloadingZip}
          />
        </div>
      </div>
    </dialog>
  );
};

interface AssignmentSpeedGraderBodyProps {
  classId: string;
  assignmentId: string;
  row: AssignmentSubmission;
  hasNext: boolean;
  onAdvanceNext: () => void;
  onDownloadZip: () => void;
  isDownloadingZip: boolean;
}

const AssignmentSpeedGraderBody = ({
  classId,
  assignmentId,
  row,
  hasNext,
  onAdvanceNext,
  onDownloadZip,
  isDownloadingZip,
}: AssignmentSpeedGraderBodyProps) => {
  const grade = useGradeInAssignment();
  const [score, setScore] = useState(row.score?.toString() ?? '');
  const [comment, setComment] = useState(row.comment ?? '');
  const [error, setError] = useState<string | null>(null);
  const advanceAfterSaveRef = useRef(false);

  const previewFiles = toPreviewFiles(row);

  const submitGrade = (advanceAfter: boolean) => {
    const value = Number(score);
    if (score.trim() === '' || Number.isNaN(value) || value < 0 || value > MAX_SCORE) {
      setError(`The score must be a number from 0 to ${MAX_SCORE}.`);
      return;
    }
    setError(null);
    advanceAfterSaveRef.current = advanceAfter;
    grade.mutate(
      {
        classId,
        assignmentId,
        submissionId: row.id,
        score: value,
        comment: comment.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Grade saved');
          if (advanceAfterSaveRef.current && hasNext) onAdvanceNext();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submitGrade(false);
  };

  const leftPane = (
    <div className="flex h-full flex-col gap-3 p-3">
      {row.answerText && (
        <div
          className={
            previewFiles.length > 0
              ? 'max-h-40 shrink-0 overflow-auto rounded-lg border bg-card p-3'
              : 'flex-1 overflow-auto rounded-lg border bg-card p-4'
          }
        >
          <p className="m-0 mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Text Submission
          </p>
          <pre className="m-0 whitespace-pre-wrap font-sans text-sm text-foreground">
            {row.answerText}
          </pre>
        </div>
      )}
      {(previewFiles.length > 0 || !row.answerText) && (
        <FilePreviewPanel
          files={previewFiles}
          className="min-h-0 flex-1"
          emptyMessage="This submission does not contain any attached files."
        />
      )}
    </div>
  );

  const rightPane = (
    <div className="flex h-full flex-col overflow-y-auto p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3">
        <div>
          <h3 className="m-0 text-base font-semibold">{row.studentName}</h3>
          <p className="m-0 mt-0.5 text-xs text-muted-foreground">
            {row.studentCode ? `${row.studentCode} · ` : ''}
            Submitted {formatDateTime(row.submittedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={row.score === null ? 'SUBMITTED' : 'GRADED'} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isDownloadingZip}
            onClick={onDownloadZip}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            Zip
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-1 flex-col gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`sg-score-${row.id}`}>Score (0–{MAX_SCORE})</Label>
          <Input
            id={`sg-score-${row.id}`}
            type="number"
            step="0.25"
            min={0}
            max={MAX_SCORE}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="Enter score…"
          />
        </div>

        <div className="flex flex-1 flex-col space-y-1.5">
          <Label htmlFor={`sg-comment-${row.id}`}>Feedback</Label>
          <textarea
            id={`sg-comment-${row.id}`}
            rows={6}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write constructive feedback for the student…"
            className="min-h-[140px] w-full flex-1 resize-y rounded-md border bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && (
          <p role="alert" className="m-0 text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t pt-3">
          <Button
            type="submit"
            variant={hasNext ? 'outline' : 'default'}
            disabled={grade.isPending}
          >
            {grade.isPending ? 'Saving…' : row.score === null ? 'Submit grade' : 'Update grade'}
          </Button>
          {hasNext && (
            <Button
              type="button"
              disabled={grade.isPending}
              onClick={() => submitGrade(true)}
            >
              Save &amp; Next
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );

  return (
    <ResizableSplitPane
      left={leftPane}
      right={rightPane}
      initialLeftPercent={62}
      storageKey="lms-assignment-speedgrader-split"
      leftLabel="Submission preview"
      rightLabel="Grading panel"
    />
  );
};