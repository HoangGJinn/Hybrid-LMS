import { toast } from 'sonner';
import { formatDateTime } from '@shared/utils/format';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { StatusBadge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { toAsyncState } from '@shared/utils/async-state';
import { pad } from '@shared/utils/format';
import { useCountdown } from '@shared/hooks/useCountdown';
import { cn } from '@shared/utils/cn';
import { useAssignmentDetail } from '../hooks/useAssignmentDetail';
import { useSubmitAssignment } from '../hooks/useSubmitAssignment';
import type {
  Assignment,
  AssignmentSubmission,
} from '../types/assignments.types';
import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Link, useParams } from 'react-router';
import { FileUp, Paperclip, X } from 'lucide-react';

const AssignmentDetailPage = () => {
  const { assignmentId = '' } = useParams();
  const state = toAsyncState(useAssignmentDetail(assignmentId));
  return (
    <AsyncView
      state={state}
      empty={
        <EmptyState
          title="Assignment not found"
          action={<Link to="/student/assignments">Back to Assignments</Link>}
        />
      }
    >
      {(d) => (
        <Detail
          key={d.assignment.id}
          assignment={d.assignment}
          submission={d.mine}
        />
      )}
    </AsyncView>
  );
};

const Detail = ({
  assignment,
  submission,
}: {
  assignment: Assignment;
  submission: AssignmentSubmission | null;
}) => {
  const submitAssignment = useSubmitAssignment();
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const cd = useCountdown(assignment.endAt);
  const canSubmit = assignment.status === 'OPEN' && !cd.expired;

  const addFiles = (list: FileList | null) =>
    list && setFiles((f) => [...f, ...Array.from(list)]);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = () =>
    submitAssignment.mutate(
      { assignmentId: assignment.id, fileNames: files.map((f) => f.name) },
      {
        onSuccess: () => {
          setFiles([]);
          toast.success('Submission saved');
        },
        onError: () => toast.error('Upload failed'),
      },
    );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={assignment.title}
        subtitle={`Due ${formatDateTime(assignment.endAt)}`}
        actions={
          <StatusBadge
            status={
              submission
                ? submission.score !== null
                  ? 'GRADED'
                  : 'SUBMITTED'
                : assignment.status
            }
          />
        }
      />
      <div className="mb-4 rounded-lg border bg-card p-4">
        <p className="mt-0 text-sm font-semibold">Instructions</p>
        <p className="m-0 text-sm text-muted-foreground">
          {assignment.instruction}
        </p>
      </div>
      <div className="mb-4 rounded-lg border bg-card p-4">
        <p className="m-0 text-sm text-muted-foreground">Time remaining</p>
        <p
          className={cn(
            'm-0 font-mono text-2xl font-bold',
            cd.expired ? 'text-destructive' : 'text-brand',
          )}
        >
          {cd.expired
            ? 'Deadline passed'
            : `${cd.days}d ${pad(cd.hours)}:${pad(cd.minutes)}:${pad(cd.seconds)}`}
        </p>
      </div>

      {submission && (
        <div className="mb-4 rounded-lg border bg-card p-4">
          <p className="mt-0 text-sm font-semibold">Your submission</p>
          <p className="m-0 text-xs text-muted-foreground">
            Submitted {formatDateTime(submission.submittedAt)}
          </p>
          <ul className="my-2 list-none space-y-1 p-0">
            {submission.fileNames.map((n) => (
              <li key={n} className="flex items-center gap-2 text-sm">
                <Paperclip className="h-4 w-4" />
                {n}
              </li>
            ))}
          </ul>
          {submission.score !== null ? (
            <div className="rounded-md bg-success/10 p-3 text-sm">
              <strong>Score: {submission.score} / 10</strong>
              {submission.comment && (
                <p className="mb-0 mt-1">Feedback: {submission.comment}</p>
              )}
            </div>
          ) : (
            <p className="m-0 text-sm text-muted-foreground">
              Awaiting grading.
            </p>
          )}
        </div>
      )}

      {canSubmit && (
        <div className="rounded-lg border bg-card p-4">
          <p className="mt-0 text-sm font-semibold">
            {submission ? 'Resubmit' : 'Submit your work'}
          </p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => input.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground',
              dragging && 'border-primary bg-primary/15',
            )}
          >
            <FileUp className="h-8 w-8" />
            Drag and drop files here, or click to browse
            <input
              ref={input}
              type="file"
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>
          {files.length > 0 && (
            <ul className="mt-3 list-none space-y-1 p-0">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>{f.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}
                    className="border-0 bg-transparent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {submitAssignment.isError && (
            <p className="text-sm text-destructive">
              Upload failed. Please try again.
            </p>
          )}
          <Button
            className="mt-3"
            disabled={files.length === 0 || submitAssignment.isPending}
            onClick={handleSubmit}
          >
            {submitAssignment.isPending ? 'Uploading…' : 'Submit Assignment'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AssignmentDetailPage;
