import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/core/api/errors';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/Button';
import { useRemoveParticipant } from '../hooks/useParticipants';
import type { ClassView, ParticipantView } from '../types/courses.types';

interface RemoveParticipantConfirmProps {
  /** The participant to remove; `null` keeps the dialog closed. */
  participant: ParticipantView | null;
  course: ClassView;
  onClose: () => void;
}

const RemoveBody = ({
  participant,
  course,
  onClose,
}: {
  participant: ParticipantView;
  course: ClassView;
  onClose: () => void;
}) => {
  const { mutate, isPending } = useRemoveParticipant(course.id);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    mutate(participant.studentId, {
      onSuccess: () => {
        toast.success(`${participant.fullName} was removed from ${course.classCode}.`);
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

/** Confirmation of "Remove Participant": ends the enrolment only. */
export const RemoveParticipantConfirm = ({
  participant,
  course,
  onClose,
}: RemoveParticipantConfirmProps) => (
  <Modal open={participant !== null} title="Remove participant?" onClose={onClose}>
    {participant && (
      <RemoveBody
        key={participant.studentId}
        participant={participant}
        course={course}
        onClose={onClose}
      />
    )}
  </Modal>
);
