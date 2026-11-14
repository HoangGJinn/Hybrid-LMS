import { toast } from 'sonner';
import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Columns2,
  Eye,
  FileText,
} from 'lucide-react';
import {
  FilePreviewModal,
  type PreviewableFile,
} from '@shared/components/file-preview';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { useGradeQueueItem } from '../hooks/useGradeQueueItem';
import type { GradingQueueItem } from '../types/grading.types';

const toPreviewFiles = (item: GradingQueueItem): PreviewableFile[] =>
  item.files.map((file) => ({
    fileId: file.fileId,
    fileName: file.fileName,
    fileUrl: file.downloadUrl,
  }));

export interface GradingDeskDetailCardProps {
  item: GradingQueueItem;
  hasPrev: boolean;
  hasNext: boolean;
  indexLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onOpenSpeedGrader: () => void;
}

/** Rendered with `key={item.queueId}`, so local draft fields start fresh per item. */
export const GradingDeskDetailCard = ({
  item,
  hasPrev,
  hasNext,
  indexLabel,
  onPrev,
  onNext,
  onOpenSpeedGrader,
}: GradingDeskDetailCardProps) => {
  const gradeMutation = useGradeQueueItem();
  const [score, setScore] = useState(item.score?.toString() ?? '');
  const [comment, setComment] = useState(item.comment ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewQuestionOpen, setPreviewQuestionOpen] = useState(false);

  const error = validationError ?? gradeMutation.error?.message ?? null;
  const saving = gradeMutation.isPending;

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
          if (advanceAfter && hasNext) onNext();
        },
      },
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitGrade(false);
  };

  const previewFiles = toPreviewFiles(item);
  const questionPreviewFile: PreviewableFile[] =
    item.kind === 'exam' && item.questionFile
      ? [
          {
            fileId: item.questionFile.fileId,
            fileName: item.questionFile.fileName,
            fileUrl: item.questionFile.downloadUrl,
          },
        ]
      : [];

  return (
    <Card
      title={
        item.studentCode
          ? `${item.studentName} · ${item.studentCode}`
          : item.studentName
      }
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            onClick={onPrev}
            aria-label="Previous student"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">{indexLabel}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={onNext}
            aria-label="Next student"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" onClick={onOpenSpeedGrader}>
            <Columns2 />
            SpeedGrader
          </Button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            item.kind === 'exam'
              ? 'rounded bg-violet-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300'
              : 'rounded bg-sky-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300'
          }
        >
          {item.kind === 'exam' ? 'Exam (File)' : 'Assignment'}
        </span>
        <p className="m-0 text-sm font-medium text-foreground">{item.title}</p>
        {item.className && (
          <span className="text-xs text-muted-foreground">
            · {item.className}
          </span>
        )}
      </div>

      <p className="m-0 mt-1 text-xs text-muted-foreground">
        Submitted {new Date(item.submittedAt).toLocaleString()}
      </p>

      {item.kind === 'exam' && item.questionFile && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs">
          <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Question file: {item.questionFile.fileName}
            </span>
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => setPreviewQuestionOpen(true)}
          >
            <Eye className="mr-1 h-3 w-3" />
            View prompt
          </Button>
        </div>
      )}

      {item.files.length > 0 ? (
        <ul className="m-0 my-4 list-none space-y-2 p-0">
          {item.files.map((file, idx) => (
            <li
              key={file.fileId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-brand" />
                <a
                  href={file.downloadUrl}
                  download={file.fileName}
                  className="truncate text-brand hover:underline"
                >
                  {file.fileName}
                </a>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setPreviewIndex(idx)}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        item.kind === 'exam' && (
          <p className="my-4 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            No files were uploaded for this attempt.
          </p>
        )
      )}

      {item.kind === 'assignment' && item.answerText && (
        <pre className="m-0 mb-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">
          {item.answerText}
        </pre>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="score">Score (0–10)</Label>
          <Input
            id="score"
            type="number"
            step="0.25"
            min={0}
            max={10}
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="comment">Feedback</Label>
          <textarea
            id="comment"
            rows={4}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-md border bg-background p-2 text-sm"
          />
        </div>
        {error && <p className="m-0 text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
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

      <FilePreviewModal
        open={previewIndex !== null}
        files={previewFiles}
        initialIndex={previewIndex ?? 0}
        title={`${item.studentName} — ${item.title}`}
        onClose={() => setPreviewIndex(null)}
      />

      {questionPreviewFile.length > 0 && (
        <FilePreviewModal
          open={previewQuestionOpen}
          files={questionPreviewFile}
          title={`Question Paper — ${item.title}`}
          onClose={() => setPreviewQuestionOpen(false)}
        />
      )}
    </Card>
  );
};

