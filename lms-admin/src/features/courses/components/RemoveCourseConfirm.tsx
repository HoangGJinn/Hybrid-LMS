import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/core/api/errors';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/Button';
import { useRemoveClass } from '../hooks/useRemoveClass';
import type { ClassView } from '../types/courses.types';

interface RemoveCourseConfirmProps {
  /** The class to permanently remove; `null` keeps the dialog closed. */
  course: ClassView | null;
  onClose: () => void;
  onRemoved?: () => void;
}

const RemoveBody = ({
  course,
  onClose,
  onRemoved,
}: {
  course: ClassView;
  onClose: () => void;
  onRemoved?: () => void;
}) => {
  const { mutate, isPending } = useRemoveClass();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    mutate(course.id, {
      onSuccess: () => {
        toast.success(`${course.classCode} has been permanently removed.`);
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
          {course.classCode} — {course.name}
        </span>{' '}
        will be permanently removed and hidden from active and ended course lists.
        Existing historical records are kept for audit logs, and this course can no
        longer be edited or modified.
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
          Remove course
        </Button>
      </div>
    </div>
  );
};

/** Confirmation dialog for permanently soft-deleting a course. */
export const RemoveCourseConfirm = ({
  course,
  onClose,
  onRemoved,
}: RemoveCourseConfirmProps) => (
  <Modal open={course !== null} title="Remove course permanently?" onClose={onClose}>
    {course && (
      <RemoveBody
        key={course.id}
        course={course}
        onClose={onClose}
        onRemoved={onRemoved}
      />
    )}
  </Modal>
);
