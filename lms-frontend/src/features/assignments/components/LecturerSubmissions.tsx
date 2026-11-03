import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
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

/** Lecturer's view of an assignment: who submitted, their work, grading, and downloads. */
export const LecturerSubmissions = ({
  classId,
  assignment,
}: {
  classId: string;
  assignment: AssignmentDetail;
}) => {
  const state = toAsyncState(useClassSubmissions(classId, assignment.id));
  const download = useDownloadSubmissions();
  const downloadZip = (submissionId: string | undefined, fileName: string) =>
    download.mutate(
      { classId, assignmentId: assignment.id, submissionId, fileName },
      { onError: (error) => toast.error(error.message) },
    );

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-xl font-medium">Submissions</h2>
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
      <AsyncView
        state={state}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            title="No submissions yet"
            description="Students' work will appear here."
          />
        }
      >
        {(rows) => {
          const graded = rows.filter((row) => row.score !== null).length;
          return (
            <>
              <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                <Stat label="Submitted" value={rows.length} />
                <Stat label="Graded" value={graded} />
                <Stat label="To grade" value={rows.length - graded} />
              </div>
              <ul className="m-0 list-none space-y-3 p-0">
                {rows.map((row) => (
                  <SubmissionRow
                    key={row.id}
                    classId={classId}
                    assignmentId={assignment.id}
                    row={row}
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
  onDownload: () => void;
}

/** One student's submission with its grading form. The parent keys it by submission id, so the form state is per row. */
const SubmissionRow = ({
  classId,
  assignmentId,
  row,
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
        <div className="flex items-center gap-2">
          <StatusBadge status={row.score === null ? 'SUBMITTED' : 'GRADED'} />
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