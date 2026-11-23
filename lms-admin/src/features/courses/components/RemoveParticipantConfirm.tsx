import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/core/api/errors';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/Button';
import {
  useRemoveParticipant,
  useRemoveParticipants,
} from '../hooks/useParticipants';
import type { ClassView, ParticipantView } from '../types/courses.types';

interface RemoveParticipantConfirmProps {
  /** Single participant to remove; `null` keeps single mode closed. */
  participant?: ParticipantView | null;
  /** Multiple participants to remove in bulk; empty or omitted keeps bulk mode closed. */
  participants?: ParticipantView[];
  course: ClassView;
  onClose: () => void;
  onRemoved?: () => void;
}

const SingleRemoveBody = ({
  participant,
  course,
  onClose,
  onRemoved,
}: {
  participant: ParticipantView;
  course: ClassView;
  onClose: () => void;
  onRemoved?: () => void;
}) => {
  const { mutate, isPending } = useRemoveParticipant(course.id);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    mutate(participant.studentId, {
      onSuccess: () => {
        toast.success(`${participant.fullName} was removed from ${course.classCode}.`);
        onRemoved?.();
        onClose();
      },
      onError: (err) => setError(getErrorMessage(err)),
    });
  };

  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">
          {participant.fullName} ({participant.studentCode})
        </span>{' '}
        will be removed from{' '}
        <span className="font-semibold text-foreground">{course.classCode}</span>.
        Their account and their other classes are not affected, and they can be
        added again later.
      </p>
      {error && (
        <p
          role="alert"
          className="m-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} isLoading={isPending}>
          Remove Participant
        </Button>
      </div>
    </div>
  );
};

const BulkRemoveBody = ({
  participants,
  course,
  onClose,
  onRemoved,
}: {
  participants: ParticipantView[];
  course: ClassView;
  onClose: () => void;
  onRemoved?: () => void;
}) => {
  const { mutate, isPending } = useRemoveParticipants(course.id);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    mutate(
      participants.map((p) => p.studentId),
      {
        onSuccess: ({ removed }) => {
          toast.success(
            `Removed ${removed} participant${removed === 1 ? '' : 's'} from ${course.classCode}.`,
          );
          onRemoved?.();
          onClose();
        },
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">
          {participants.length} selected student
          {participants.length === 1 ? '' : 's'}
        </span>{' '}
        will be removed from{' '}
        <span className="font-semibold text-foreground">{course.classCode}</span>.
        Their accounts and their other classes are not affected, and they can be
        added again later.
      </p>
      <ul className="m-0 max-h-40 list-disc space-y-1 overflow-y-auto rounded-md border bg-muted/40 py-2 pl-7 pr-3 text-xs text-muted-foreground">
        {participants.map((p) => (
          <li key={p.studentId}>
            <span className="font-medium text-foreground">{p.fullName}</span> (
            {p.studentCode})
          </li>
        ))}
      </ul>
      {error && (
        <p
          role="alert"
          className="m-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} isLoading={isPending}>
          Remove {participants.length} Participant
          {participants.length === 1 ? '' : 's'}
        </Button>
      </div>
    </div>
  );
};

/** Confirmation of "Remove Participant" (single or bulk): ends the enrolment only. */
export const RemoveParticipantConfirm = ({
  participant = null,
  participants = [],
  course,
  onClose,
  onRemoved,
}: RemoveParticipantConfirmProps) => {
  const isBulk = participants.length > 0;
  const open = participant !== null || isBulk;
  const title = isBulk
    ? `Remove ${participants.length} participants?`
    : 'Remove participant?';

  return (
    <Modal open={open} title={title} onClose={onClose}>
      {isBulk ? (
        <BulkRemoveBody
          key={participants.map((p) => p.studentId).join(',')}
          participants={participants}
          course={course}
          onClose={onClose}
          onRemoved={onRemoved}
        />
      ) : (
        participant && (
          <SingleRemoveBody
            key={participant.studentId}
            participant={participant}
            course={course}
            onClose={onClose}
            onRemoved={onRemoved}
          />
        )
      )}
    </Modal>
  );
};
