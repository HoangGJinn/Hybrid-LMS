import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
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
        <div className="mx-auto max-w-4xl">
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

/** Opening and due times, the brief, how to submit and the files the lecturer attached. */
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
    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
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
      <p className="mt-3 rounded-md border-l-4 border-primary bg-card p-3">
        <strong>Note:</strong> {assignment.submissionNote}
      </p>
    )}
    {assignment.files.length > 0 && (
      <FileList files={assignment.files} className="mt-4" />
    )}
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
  // A graded submission is locked on the backend too.
  const isGraded = submission?.score != null;

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
      {isOpenNow && isGraded && (
        <p className="mt-3 text-sm text-muted-foreground">
          Your submission has been graded, so it can no longer be edited.
        </p>
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