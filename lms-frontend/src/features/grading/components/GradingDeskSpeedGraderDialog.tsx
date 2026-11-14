import { toast } from 'sonner';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileText,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import {
  FilePreviewPanel,
  ResizableSplitPane,
  useElementFullscreen,
  type PreviewableFile,
} from '@shared/components/file-preview';
import { StatusBadge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { cn } from '@shared/utils/cn';
import { useGradeQueueItem } from '../hooks/useGradeQueueItem';
import type { GradingQueueItem } from '../types/grading.types';

const toPreviewFiles = (item: GradingQueueItem): PreviewableFile[] =>
  item.files.map((file) => ({
    fileId: file.fileId,
    fileName: file.fileName,
    fileUrl: file.downloadUrl,
  }));

export interface GradingDeskSpeedGraderDialogProps {
  list: GradingQueueItem[];
  activeQueueId: string;
  onSelect: (queueId: string) => void;
  onClose: () => void;
}

export const GradingDeskSpeedGraderDialog = ({
  list,
  activeQueueId,
  onSelect,
  onClose,
}: GradingDeskSpeedGraderDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { isNativeFullscreen, enterFullscreen, exitFullscreen } =
    useElementFullscreen(contentRef);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
  }, []);

  const currentIndex = Math.max(
    0,
    list.findIndex((s) => s.queueId === activeQueueId),
  );
  const item = list[currentIndex];
  if (!item) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < list.length - 1;
  const showingFullScreen = isNativeFullscreen || isExpanded;

  const handleToggleFullScreen = async () => {
    if (isNativeFullscreen || isExpanded) {
      if (isNativeFullscreen) await exitFullscreen();
      setIsExpanded(false);
      return;
    }
    const enteredNative = await enterFullscreen();
    if (!enteredNative) {
      setIsExpanded(true);
    }
  };

  const handleCloseModal = () => {
    if (isNativeFullscreen) {
      void exitFullscreen();
    }
    onClose();
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) handleCloseModal();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label="Grading Desk SpeedGrader"
      onCancel={(event) => {
        if (document.fullscreenElement) {
          event.preventDefault();
        }
      }}
      onClose={handleCloseModal}
      onClick={handleBackdropClick}
      className={cn(
        'm-auto border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/60',
        isNativeFullscreen
          ? 'h-screen w-screen max-w-none rounded-none border-0'
          : isExpanded
            ? 'h-[calc(100vh-0.5rem)] w-[calc(100vw-0.5rem)] max-w-none rounded-xl'
            : 'h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[1600px] rounded-2xl',
      )}
    >
      <div
        ref={contentRef}
        className={cn(
          'flex h-full flex-col bg-card text-card-foreground',
          isNativeFullscreen && 'h-screen w-screen',
        )}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              SpeedGrader
            </span>
            <span
              className={
                item.kind === 'exam'
                  ? 'rounded bg-violet-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300'
                  : 'rounded bg-sky-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300'
              }
            >
              {item.kind === 'exam' ? 'Exam' : 'Assignment'}
            </span>
            <h2 className="m-0 truncate text-sm font-semibold sm:text-base">
              {item.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => hasPrev && onSelect(list[currentIndex - 1].queueId)}
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Prev
            </Button>

            <div className="flex items-center gap-1.5">
              <select
                aria-label="Select submission to grade"
                value={item.queueId}
                onChange={(e) => onSelect(e.target.value)}
                className="h-8 max-w-[300px] rounded-md border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {list.map((entry) => (
                  <option key={entry.queueId} value={entry.queueId}>
                    [{entry.kind === 'exam' ? 'Exam' : 'Assign'}]{' '}
                    {entry.studentName} · {entry.title}
                    {entry.score !== null
                      ? ` — ${entry.score.toFixed(2)}/10`
                      : ' — Pending'}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">
                ({currentIndex + 1} / {list.length})
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => hasNext && onSelect(list[currentIndex + 1].queueId)}
            >
              Next
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={
                showingFullScreen
                  ? 'Exit full screen SpeedGrader'
                  : 'Enter full screen SpeedGrader'
              }
              title={
                showingFullScreen
                  ? 'Exit full screen (Esc)'
                  : 'Full screen (F11)'
              }
              onClick={() => void handleToggleFullScreen()}
            >
              {showingFullScreen ? (
                <>
                  <Minimize2 className="mr-1.5 h-3.5 w-3.5" />
                  Exit full screen
                </>
              ) : (
                <>
                  <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                  Full screen
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close SpeedGrader"
              onClick={handleCloseModal}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <GradingDeskSpeedGraderBody
            key={item.queueId}
            item={item}
            hasNext={hasNext}
            onAdvanceNext={() =>
              hasNext && onSelect(list[currentIndex + 1].queueId)
            }
          />
        </div>
      </div>
    </dialog>
  );
};

const GradingDeskSpeedGraderBody = ({
  item,
  hasNext,
  onAdvanceNext,
}: {
  item: GradingQueueItem;
  hasNext: boolean;
  onAdvanceNext: () => void;
}) => {
  const gradeMutation = useGradeQueueItem();
  const [score, setScore] = useState(item.score?.toString() ?? '');
  const [comment, setComment] = useState(item.comment ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'submission' | 'question'>(
    'submission',
  );

  const error = validationError ?? gradeMutation.error?.message ?? null;
  const saving = gradeMutation.isPending;

  const previewFiles = toPreviewFiles(item);
  const questionFiles: PreviewableFile[] =
    item.kind === 'exam' && item.questionFile
      ? [
          {
            fileId: item.questionFile.fileId,
            fileName: item.questionFile.fileName,
            fileUrl: item.questionFile.downloadUrl,
          },
        ]
      : [];

  const submitGrade = (advanceAfter: boolean) => {
    const n = Number(score);
    if (score.trim() === '' || Number.isNaN(n) || n < 0 || n > 10) {
      setValidationError('Score must be between 0 and 10.');
      return;
    }
    setValidationError(null);
    gradeMutation.mutate(
      {
        item,
        score: Math.round(n * 100) / 100,
        comment: comment.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Grade saved');
          if (advanceAfter && hasNext) onAdvanceNext();
        },
      },
    );
  };

  const leftPane = (
    <div className="flex h-full flex-col gap-3 p-3">
      {questionFiles.length > 0 && (
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={leftTab === 'submission' ? 'default' : 'outline'}
            className="h-7 px-2.5 text-xs"
            onClick={() => setLeftTab('submission')}
          >
            <FileText className="mr-1 h-3.5 w-3.5" />
            Student submission ({previewFiles.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={leftTab === 'question' ? 'default' : 'outline'}
            className="h-7 px-2.5 text-xs"
            onClick={() => setLeftTab('question')}
          >
            <BookOpen className="mr-1 h-3.5 w-3.5" />
            Question paper
          </Button>
        </div>
      )}

      {leftTab === 'question' && questionFiles.length > 0 ? (
        <FilePreviewPanel
          files={questionFiles}
          className="min-h-0 flex-1"
          emptyMessage="No question file available."
        />
      ) : (
        <>
          {item.kind === 'assignment' && item.answerText && (
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
                {item.answerText}
              </pre>
            </div>
          )}
          {(previewFiles.length > 0 ||
            item.kind === 'exam' ||
            !item.answerText) && (
            <FilePreviewPanel
              files={previewFiles}
              className="min-h-0 flex-1"
              emptyMessage="This submission does not contain any attached files."
            />
          )}
        </>
      )}
    </div>
  );

  const rightPane = (
    <div className="flex h-full flex-col overflow-y-auto p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3">
        <div>
          <h3 className="m-0 text-base font-semibold">
            {item.studentCode
              ? `${item.studentName} (${item.studentCode})`
              : item.studentName}
          </h3>
          <p className="m-0 mt-0.5 text-xs text-muted-foreground">
            {item.title}
            {item.className ? ` · ${item.className}` : ''} · Submitted{' '}
            {new Date(item.submittedAt).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={item.score === null ? 'SUBMITTED' : 'GRADED'} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitGrade(false);
        }}
        className="mt-4 flex flex-1 flex-col gap-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor={`desk-sg-score-${item.queueId}`}>Score (0–10)</Label>
          <Input
            id={`desk-sg-score-${item.queueId}`}
            type="number"
            step="0.25"
            min={0}
            max={10}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="Enter score…"
          />
        </div>

        <div className="flex flex-1 flex-col space-y-1.5">
          <Label htmlFor={`desk-sg-comment-${item.queueId}`}>Feedback</Label>
          <textarea
            id={`desk-sg-comment-${item.queueId}`}
            rows={6}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write constructive feedback for the student…"
            className="min-h-[140px] w-full flex-1 resize-y rounded-md border bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && <p className="m-0 text-sm text-destructive">{error}</p>}

        <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t pt-3">
          <Button
            type="submit"
            variant={hasNext ? 'outline' : 'default'}
            disabled={saving}
          >
            {saving
              ? 'Saving…'
              : item.score === null
                ? 'Submit grade'
                : 'Update grade'}
          </Button>
          {hasNext && (
            <Button
              type="button"
              disabled={saving}
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
      storageKey="lms-grading-desk-speedgrader-split"
      leftLabel="Submission preview"
      rightLabel="Grading panel"
    />
  );
};

