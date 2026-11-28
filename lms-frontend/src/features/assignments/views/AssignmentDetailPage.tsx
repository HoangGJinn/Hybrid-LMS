import { useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarDays, Clock, Lock, Pencil } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router';
import { toast } from 'sonner';
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
import { Chip } from '../components/Chip';
import { CreateAssignmentDialog } from '../components/CreateAssignmentDialog';
import { FileList } from '../components/FileList';
import { LecturerSubmissions } from '../components/LecturerSubmissions';
import { SubmissionForm } from '../components/SubmissionForm';
import { useAssignmentDetail } from '../hooks/useAssignmentDetail';
import { useSubmitAssignment } from '../hooks/useSubmitAssignment';
import { useUpdateAssignment } from '../hooks/useUpdateAssignment';
import type { AssignmentDetail } from '../types/assignments.types';

const MINUTE = 60_000;

/** `6 days 23 hours 57 mins`; zero parts are left out. */
const formatDuration = (ms: number): string => {
  const totalMinutes = Math.floor(ms / MINUTE);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [
    days > 0 && `${days} ${days === 1 ? 'day' : 'days'}`,
    hours > 0 && `${hours} ${hours === 1 ? 'hour' : 'hours'}`,
    minutes > 0 && `${minutes} ${minutes === 1 ? 'min' : 'mins'}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'less than a minute';
};

/** An assignment of a class. Students see their submission status and can submit; lecturers see the brief. */
const AssignmentDetailPage = () => {
  const { courseId = '', assignmentId = '' } = useParams();
  const { pathname } = useLocation();
  const isLecturer = pathname.startsWith('/lecturer');
  const courseHome = isLecturer
    ? `/lecturer/classes/${courseId}`
    : `/student/courses/${courseId}`;
  const state = toAsyncState(useAssignmentDetail(courseId, assignmentId));
  const updateAssignment = useUpdateAssignment();
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);
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
        <div className="mx-auto max-w-5xl">
          {assignment.className && (
            <Link
              to={courseHome}
              className="mb-2 inline-block text-sm font-semibold text-primary no-underline hover:underline"
            >
              {assignment.classCode
                ? `${assignment.classCode} · ${assignment.className}`
                : assignment.className}
            </Link>
          )}
          <PageHeader
            title={assignment.title}
            actions={
              isLecturer ? (
                <Button
                  variant="outline"
                  onClick={() => setIsEditingAssignment(true)}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <StatusBadge status={assignment.status} />
              )
            }
          />
          {isLecturer && isEditingAssignment && (
            <CreateAssignmentDialog
              key={assignment.id}
              open
              assignment={assignment}
              isSubmitting={updateAssignment.isPending}
              onClose={() => setIsEditingAssignment(false)}
              onSubmit={(input, keptFileIds) =>
                updateAssignment.mutate(
                  {
                    classId: courseId,
                    assignmentId: assignment.id,
                    input: { ...input, keptFileIds },
                  },
                  {
                    onSuccess: () => {
                      setIsEditingAssignment(false);
                      toast.success('Assignment updated');
                    },
                    onError: (error) => toast.error(error.message),
                  },
                )
              }
            />
          )}
          <BriefBox assignment={assignment} />
          {isLecturer ? (
            <LecturerSubmissions classId={courseId} assignment={assignment} />
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

const ScheduleTile = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <div className="flex flex-1 basis-60 items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
    <span className="text-muted-foreground">{icon}</span>
    <div>
      <p className="m-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="m-0 font-semibold">{value}</p>
    </div>
  </div>
);

/** Opening and due times first, then the brief, how to submit and the files the lecturer attached. */
const BriefBox = ({ assignment }: { assignment: AssignmentDetail }) => (
  <div className="mb-6 space-y-5 rounded-2xl border bg-card p-5 text-sm">
    <div className="flex flex-wrap gap-3">
      <ScheduleTile
        icon={<CalendarDays className="h-5 w-5" />}
        label="Opened"
        value={formatDateTime(assignment.openAt)}
      />
      <ScheduleTile
        icon={<Clock className="h-5 w-5" />}
        label="Due"
        value={formatDateTime(assignment.endAt)}
      />
    </div>
    <p className="m-0 whitespace-pre-line text-base leading-relaxed">
      {assignment.instruction}
    </p>
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {assignment.submissionType === 'TEXT' ? (
        <Chip>Write your answer online</Chip>
      ) : (
        <>
          <span className="text-muted-foreground">Accepted files:</span>
          {assignment.acceptedExtensions.length === 0 ? (
            <Chip>any supported file</Chip>
          ) : (
            assignment.acceptedExtensions.map((format) => (
              <Chip key={format}>.{format}</Chip>
            ))
          )}
        </>
      )}
    </div>
    {assignment.submissionNote && (
      <p className="m-0 rounded-md border-l-4 border-primary bg-muted/40 p-3">
        <strong>Note:</strong> {assignment.submissionNote}
      </p>
    )}
    {assignment.files.length > 0 && <FileList files={assignment.files} />}
  </div>
);

type Tone = 'ok' | 'bad' | undefined;

const StatusRow = ({
  label,
  tone,
  children,
}: {
  label: string;
  tone?: Tone;
  children: ReactNode;
}) => (
  <div
    className={cn(
      'grid border-b last:border-b-0 sm:grid-cols-[14rem_1fr]',
      tone === 'ok' && 'bg-green-50',
      tone === 'bad' && 'bg-red-50',
    )}
  >
    <dt
      className={cn(
        'p-4 font-semibold',
        tone === 'ok' ? 'bg-green-100' : tone === 'bad' ? 'bg-red-100' : 'bg-muted/50',
      )}
    >
      {label}
    </dt>
    <dd className="m-0 min-w-0 p-4">{children}</dd>
  </div>
);

const LockedNote = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
    <Lock className="h-4 w-4 shrink-0" />
    {children}
  </p>
);

/** UC-12 status list plus the submit / edit form (UC-16, UC-17). */
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
  // A graded submission is locked on the backend too.
  const isGraded = submission?.score != null;

  // How far ahead of (or behind) the deadline the student handed in.
  const margin = submission
    ? +new Date(assignment.endAt) - +new Date(submission.submittedAt)
    : null;

  return (
    <section>
      <h2 className="mb-3 text-xl font-medium">Submission status</h2>
      <dl className="m-0 overflow-hidden rounded-2xl border bg-card text-sm">
        <StatusRow label="Submission status" tone={submission ? 'ok' : undefined}>
          {submission
            ? 'Submitted for grading'
            : 'No submissions have been made yet'}
        </StatusRow>
        <StatusRow label="Grading status" tone={isGraded ? 'ok' : undefined}>
          {isGraded ? (
            <span className="flex items-baseline gap-3">
              <strong className="text-xl text-green-700">
                {submission.score} / 10
              </strong>
              <span className="text-muted-foreground">Graded</span>
            </span>
          ) : (
            'Not graded yet'
          )}
        </StatusRow>
        <StatusRow
          label="Time remaining"
          tone={margin === null ? undefined : margin >= 0 ? 'ok' : 'bad'}
        >
          {margin !== null ? (
            margin >= 0 ? (
              `Submitted ${formatDuration(margin)} early`
            ) : (
              `Submitted ${formatDuration(-margin)} late`
            )
          ) : (
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
          )}
        </StatusRow>
        <StatusRow label="Last modified">
          {submission ? formatDateTime(submission.submittedAt) : '-'}
        </StatusRow>
        <StatusRow
          label={
            assignment.submissionType === 'TEXT'
              ? 'Online answer'
              : 'File submissions'
          }
        >
          {submission?.answerText ? (
            <pre className="m-0 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-sm">
              {submission.answerText}
            </pre>
          ) : submission && submission.files.length > 0 ? (
            <FileList files={submission.files} />
          ) : (
            '-'
          )}
        </StatusRow>
        {isGraded && (
          <StatusRow label="Feedback">
            {submission.comment || (
              <span className="text-muted-foreground">
                No feedback from your lecturer
              </span>
            )}
          </StatusRow>
        )}
      </dl>

      {!isOpenNow && !submission && (
        <LockedNote>
          {cd.expired
            ? 'The deadline has passed, so submissions are closed.'
            : 'This assignment is not open for submissions yet.'}
        </LockedNote>
      )}
      {!isOpenNow && submission && cd.expired && (
        <LockedNote>
          The deadline has passed, so your submission can no longer be edited.
        </LockedNote>
      )}
      {isOpenNow && isGraded && (
        <LockedNote>
          Your submission has been graded, so it can no longer be edited.
        </LockedNote>
      )}
      {isOpenNow && !isGraded && !isEditing && (
        <Button className="mt-4" onClick={() => setIsEditing(true)}>
          {submission ? 'Edit submission' : 'Add submission'}
        </Button>
      )}
      {isOpenNow && !isGraded && isEditing && (
        <SubmissionForm
          assignment={assignment}
          existingFiles={submission?.files ?? []}
          initialText={submission?.answerText ?? ''}
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

export default AssignmentDetailPage;