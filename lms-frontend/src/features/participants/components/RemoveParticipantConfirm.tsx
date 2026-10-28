import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@core/api/errors';
import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import { useRemoveParticipant } from '../hooks/useRemoveParticipant';
import type { ParticipantView } from '../types/participant-management.types';

interface RemoveParticipantConfirmProps {
  /** The participant to remove; `null` keeps the dialog closed. */
  participant: ParticipantView | null;
  classId: string;
  classCode: string;
  onClose: () => void;
}

const RemoveBody = ({
  participant,
  classId,
  classCode,
  onClose,
}: {
  participant: ParticipantView;
  classId: string;
  classCode: string;
  onClose: () => void;
}) => {
  const { mutate, isPending } = useRemoveParticipant(classId);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    mutate(participant.studentId, {
      onSuccess: () => {
        toast.success(`${participant.fullName} was removed from ${classCode}.`);
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
        <span className="font-semibold text-foreground">{classCode}</span>.
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
        <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
          {isPending ? 'Removing…' : 'Remove participant'}
        </Button>
      </div>
    </div>
  );
};

/** Confirmation of "Remove participant": ends the enrolment only. Same wording as the admin app. */
export const RemoveParticipantConfirm = ({
  participant,
  classId,
  classCode,
  onClose,
}: RemoveParticipantConfirmProps) => (
  <Modal open={participant !== null} title="Remove participant?" onClose={onClose}>
    {participant && (
      <RemoveBody
        key={participant.studentId}
        participant={participant}
        classId={classId}
        classCode={classCode}
        onClose={onClose}
      />
    )}
  </Modal>
);
