import { useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { toast } from 'sonner';
import { FileUp, Paperclip, X } from 'lucide-react';
import { validateDocumentFile } from '@features/documents';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { StatusBadge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { useCountdown } from '@shared/hooks/useCountdown';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { formatDateTime } from '@shared/utils/format/date';
import { pad } from '@shared/utils/format/number';
import { useAssignmentDetail } from '../hooks/useAssignmentDetail';
import { useSubmitAssignment } from '../hooks/useSubmitAssignment';
import type {
  AssignmentDetail,
  AssignmentFileLink,
} from '../types/assignments.types';

/** An assignment of a class. Students see their submission status and can submit; lecturers see the brief. */
const AssignmentDetailPage = () => {
  const { courseId = '', assignmentId = '' } = useParams();
  const { pathname } = useLocation();
  const isLecturer = pathname.startsWith('/lecturer');
  const courseHome = isLecturer
    ? `/lecturer/classes/${courseId}`
    : `/student/courses/${courseId}`;
  const state = toAsyncState(useAssignmentDetail(courseId, assignmentId));
  return (
    <AsyncView
      state={state}
      empty={
        <EmptyState
          title="Assignment not found"
          action={<Link to={courseHome}>Back to course</Link>}
        />
      }
    >
      {(assignment) => (
        <div className="mx-auto max-w-4xl">
          <PageHeader
            title={assignment.title}
            actions={
              isLecturer ? null : <StatusBadge status={assignment.status} />
            }
          />
          <BriefBox assignment={assignment} />
          {isLecturer ? (
            <LecturerSummary assignment={assignment} />
          ) : (
            <StudentSubmission
              key={assignment.id}
              classId={courseId}
              assignment={assignment}
            />
          )}
        </div>
      )}
    </AsyncView>
  );
};

/** Opening and due times, the brief and the files the lecturer attached. */
const BriefBox = ({ assignment }: { assignment: AssignmentDetail }) => (
  <div className="mb-6 rounded-lg bg-muted/50 p-5 text-sm">
    <p className="m-0">
      <strong>Opened:</strong> {formatDateTime(assignment.openAt)}
    </p>
    <p className="m-0 mt-1">
      <strong>Due:</strong> {formatDateTime(assignment.endAt)}
    </p>
    <hr className="my-4 border-border" />
    <p className="m-0 whitespace-pre-line text-muted-foreground">
      {assignment.instruction}
    </p>
    {assignment.files.length > 0 && (
      <FileList files={assignment.files} className="mt-4" />
    )}
  </div>
);

const FileList = ({
  files,
  className,
}: {
  files: AssignmentFileLink[];
  className?: string;
}) => (
  <ul className={cn('m-0 list-none space-y-1 p-0', className)}>
    {files.map((file) => (
      <li key={file.fileId} className="flex items-center gap-2 text-sm">
        <Paperclip className="h-4 w-4 shrink-0" />
        <a
          href={file.downloadUrl}
          download={file.fileName}
          className="text-brand hover:underline"
        >
          {file.fileName}
        </a>
      </li>
    ))}
  </ul>
);

const LecturerSummary = ({ assignment }: { assignment: AssignmentDetail }) => (
  <div className="rounded-lg border bg-card p-4 text-sm">
    <p className="m-0 font-semibold">Submissions</p>
    <p className="m-0 mt-1 text-muted-foreground">
      {assignment.submissionCount === 0
        ? 'No student has submitted yet.'
        : `${assignment.submissionCount} student(s) have submitted.`}
    </p>
  </div>
);

const StatusRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <tr className="border-b last:border-b-0 odd:bg-muted/40">
    <th scope="row" className="w-1/4 p-3 text-left font-semibold align-top">
      {label}
    </th>
    <td className="p-3 align-top">{children}</td>
  </tr>
);

/** UC-12 status table plus the submit / edit form (UC-16, UC-17). */
const StudentSubmission = ({
  classId,
  assignment,
}: {
  classId: string;
  assignment: AssignmentDetail;
}) => {
  const submitAssignment = useSubmitAssignment();
  const submission = assignment.mySubmission;
  const cd = useCountdown(assignment.endAt);
  const untilOpen = useCountdown(assignment.openAt);
  const [isEditing, setIsEditing] = useState(false);
  // The countdown to the opening time hits zero once the assignment has opened.
  const isOpenNow = untilOpen.expired && !cd.expired;

  return (
    <section>
      <h2 className="mb-3 text-xl font-medium">Submission status</h2>
      <table className="w-full border-collapse border text-sm">
        <tbody>
          <StatusRow label="Submission status">
            {submission
              ? 'Submitted for grading'
              : 'No submissions have been made yet'}
          </StatusRow>
          <StatusRow label="Grading status">
            {submission?.score != null
              ? `Graded: ${submission.score} / 10`
              : 'Not graded'}
          </StatusRow>
          <StatusRow label="Time remaining">
            <span
              className={cn(
                cd.expired && 'text-destructive',
                !cd.expired && 'font-mono',
              )}
            >
              {cd.expired
                ? 'The deadline has passed'
                : `${cd.days}d ${pad(cd.hours)}:${pad(cd.minutes)}:${pad(cd.seconds)}`}
            </span>
          </StatusRow>
          <StatusRow label="Last modified">
            {submission ? formatDateTime(submission.submittedAt) : '-'}
          </StatusRow>
          <StatusRow label="File submissions">
            {submission && submission.files.length > 0 ? (
              <FileList files={submission.files} />
            ) : (
              '-'
            )}
          </StatusRow>
          {submission?.comment && (
            <StatusRow label="Feedback">{submission.comment}</StatusRow>
          )}
        </tbody>
      </table>

      {!isOpenNow && !submission && (
        <p className="mt-3 text-sm text-muted-foreground">
          {cd.expired
            ? 'The deadline has passed, so submissions are closed.'
            : 'This assignment is not open for submissions yet.'}
        </p>
      )}
      {!isOpenNow && submission && cd.expired && (
        <p className="mt-3 text-sm text-muted-foreground">
          The deadline has passed, so your submission can no longer be edited.
        </p>
      )}
      {isOpenNow && !isEditing && (
        <Button className="mt-4" onClick={() => setIsEditing(true)}>
          {submission ? 'Edit submission' : 'Add submission'}
        </Button>
      )}
      {isOpenNow && isEditing && (
        <SubmissionForm
          existingFiles={submission?.files ?? []}
          isSubmitting={submitAssignment.isPending}
          onCancel={() => setIsEditing(false)}
          onSubmit={(input) =>
            submitAssignment.mutate(
              { classId, assignmentId: assignment.id, submission: input },
              {
                onSuccess: () => {
                  setIsEditing(false);
                  toast.success('Submission saved');
                },
                onError: (error) => toast.error(error.message),
              },
            )
          }
        />
      )}
    </section>
  );
};

interface SubmissionFormProps {
  existingFiles: AssignmentFileLink[];
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (input: { keptFileIds: string[]; newFiles: File[] }) => void;
}

const SubmissionForm = ({
  existingFiles,
  isSubmitting,
  onCancel,
  onSubmit,
}: SubmissionFormProps) => {
  const input = useRef<HTMLInputElement>(null);
  const [kept, setKept] = useState(existingFiles);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    const invalid = picked
      .map((file) => ({ file, error: validateDocumentFile(file) }))
      .find((result) => result.error !== null);
    if (invalid) {
      toast.error(`${invalid.file.name}: ${invalid.error}`);
      return;
    }
    setNewFiles((current) => [...current, ...picked]);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };
  const hasFiles = kept.length + newFiles.length > 0;

  return (
    <div className="mt-4 rounded-lg border bg-card p-4">
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
          aria-label="Submission files"
          onChange={(e) => {
            addFiles(e.target.files);
            // Clear the input so choosing the same file again still fires onChange.
            e.target.value = '';
          }}
        />
      </div>
      {hasFiles && (
        <ul className="mt-3 list-none space-y-1 p-0">
          {kept.map((file) => (
            <FormFileRow
              key={file.fileId}
              name={file.fileName}
              onRemove={() =>
                setKept((current) =>
                  current.filter((x) => x.fileId !== file.fileId),
                )
              }
            />
          ))}
          {newFiles.map((file, index) => (
            <FormFileRow
              key={`${file.name}-${index}`}
              name={file.name}
              onRemove={() =>
                setNewFiles((current) => current.filter((_, i) => i !== index))
              }
            />
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <Button
          disabled={!hasFiles || isSubmitting}
          onClick={() =>
            onSubmit({ keptFileIds: kept.map((x) => x.fileId), newFiles })
          }
        >
          {isSubmitting ? 'Uploading…' : 'Save submission'}
        </Button>
        <Button variant="outline" disabled={isSubmitting} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

const FormFileRow = ({
  name,
  onRemove,
}: {
  name: string;
  onRemove: () => void;
}) => (
  <li className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
    <span>{name}</span>
    <button
      type="button"
      aria-label={`Remove ${name}`}
      onClick={onRemove}
      className="border-0 bg-transparent"
    >
      <X className="h-4 w-4" />
    </button>
  </li>
);

export default AssignmentDetailPage;