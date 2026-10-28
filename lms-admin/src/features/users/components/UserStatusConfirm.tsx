import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/core/api/errors';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/Button';
import {
  useActivateUser,
  useDeactivateUser,
} from '../hooks/useUserMutations';
import type { ManagedRole, ManagedUser } from '../types/users.types';
import { ROLE_CONFIG } from '../utils/role-config';

export interface StatusTarget {
  user: ManagedUser;
  action: 'deactivate' | 'activate';
}

interface UserStatusConfirmProps {
  /** What to confirm; `null` keeps the dialog closed. */
  target: StatusTarget | null;
  role: ManagedRole;
  onClose: () => void;
}

const StatusBody = ({
  target,
  role,
  onClose,
}: {
  target: StatusTarget;
  role: ManagedRole;
  onClose: () => void;
}) => {
  const { user, action } = target;
  const deactivate = useDeactivateUser();
  const activate = useActivateUser();
  const mutation = action === 'deactivate' ? deactivate : activate;
  const [error, setError] = useState<string | null>(null);
  const isDeactivating = action === 'deactivate';

  const handleConfirm = () => {
    setError(null);
    mutation.mutate(user.id, {
      onSuccess: () => {
        toast.success(
          `${user.fullName} has been ${isDeactivating ? 'deactivated' : 'activated'}.`,
        );
        onClose();
      },
      onError: (err) => setError(getErrorMessage(err)),
    });
  };

  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">
          {user.fullName} ({user.email})
        </span>{' '}
        {isDeactivating
          ? `will no longer be able to sign in or use the system. The account and its history are kept, and you can activate it again at any time.${
              role === 'LECTURER' ? ' Classes already assigned are not changed.' : ''
            }`
          : `will be able to sign in again as a ${ROLE_CONFIG[role].singular}.`}
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
        <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          variant={isDeactivating ? 'danger' : 'primary'}
          onClick={handleConfirm}
          isLoading={mutation.isPending}
        >
          {isDeactivating ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
    </div>
  );
};

/** Confirmation dialog for deactivating (soft delete) or re-activating an account. Users are never deleted. */
export const UserStatusConfirm = ({
  target,
  role,
  onClose,
}: UserStatusConfirmProps) => (
  <Modal
    open={target !== null}
    title={
      target?.action === 'activate' ? 'Activate account?' : 'Deactivate account?'
    }
    onClose={onClose}
  >
    {target && (
      <StatusBody
        key={`${target.user.id}-${target.action}`}
        target={target}
        role={role}
        onClose={onClose}
      />
    )}
  </Modal>
);
