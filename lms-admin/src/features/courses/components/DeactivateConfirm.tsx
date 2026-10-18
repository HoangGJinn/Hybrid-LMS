import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/core/api/errors';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/Button';
import { useDeactivateClass } from '../hooks/useDeactivateClass';
import type { ClassView } from '../types/courses.types';

interface DeactivateConfirmProps {
  /** The class to deactivate; `null` keeps the dialog closed. */
  course: ClassView | null;
  onClose: () => void;
}

const DeactivateBody = ({
  course,
  onClose,
}: {
  course: ClassView;
  onClose: () => void;
}) => {
  const { mutate, isPending } = useDeactivateClass();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    mutate(course.id, {
      onSuccess: () => {
        toast.success(`${course.classCode} has been deactivated.`);
        onClose();
      },
      onError: (err) => setError(getErrorMessage(err)),
    });
  };

  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">
          {course.classCode} — {course.name}
        </span>{' '}
        will be marked as ended and hidden from the active list. Its data is
        kept; classes are never deleted.
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
          Deactivate
        </Button>
      </div>
    </div>
  );
};

/** Confirmation dialog that replaces "delete": it ends a class instead of removing it. */
export const DeactivateConfirm = ({
  course,
  onClose,
}: DeactivateConfirmProps) => (
  <Modal open={course !== null} title="Deactivate course?" onClose={onClose}>
    {course && <DeactivateBody key={course.id} course={course} onClose={onClose} />}
  </Modal>
);
