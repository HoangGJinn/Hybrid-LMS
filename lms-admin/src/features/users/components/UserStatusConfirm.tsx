import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/core/api/errors';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/Button';
import {
  useActivateUser,
  useDeactivateUser,
  useRemoveUser,
} from '../hooks/useUserMutations';
import type { ManagedRole, ManagedUser } from '../types/users.types';
import { ROLE_CONFIG } from '../utils/role-config';

export interface StatusTarget {
  user: ManagedUser;
  action: 'deactivate' | 'activate' | 'remove';
}

interface UserStatusConfirmProps {
  /** What to confirm; `null` keeps the dialog closed. */
  target: StatusTarget | null;
  role: ManagedRole;
  onClose: () => void;
}

const DIALOG_TITLE: Record<StatusTarget['action'], string> = {
  activate: 'Activate account?',
  deactivate: 'Deactivate account?',
  remove: 'Remove account permanently?',
};

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
  const remove = useRemoveUser();
  const mutation =
    action === 'deactivate'
      ? deactivate
      : action === 'activate'
        ? activate
        : remove;
  const [error, setError] = useState<string | null>(null);
  const isDanger = action === 'deactivate' || action === 'remove';

  const getSuccessMessage = () => {
    if (action === 'remove') return `${user.fullName} has been permanently removed.`;
    if (action === 'deactivate') return `${user.fullName} has been deactivated.`;
    return `${user.fullName} has been activated.`;
  };

  const getBodyDescription = () => {
    if (action === 'remove') {
      return (
        'will be permanently removed and can never be restored or used to sign in again. ' +
        'Existing historical records are kept for audit logs.'
      );
    }
    if (action === 'deactivate') {
      return `will no longer be able to sign in or use the system. The account and its history are kept, and you can activate it again at any time.${
        role === 'LECTURER' ? ' Classes already assigned are not changed.' : ''
      }`;
    }
    return `will be able to sign in again as a ${ROLE_CONFIG[role].singular}.`;
  };

  const getConfirmLabel = () => {
    if (action === 'remove') return 'Remove permanently';
    if (action === 'deactivate') return 'Deactivate';
    return 'Activate';
  };

  const handleConfirm = () => {
    setError(null);
    mutation.mutate(user.id, {
      onSuccess: () => {
        toast.success(getSuccessMessage());
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
        {getBodyDescription()}
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
          variant={isDanger ? 'danger' : 'primary'}
          onClick={handleConfirm}
          isLoading={mutation.isPending}
        >
          {getConfirmLabel()}
        </Button>
      </div>
    </div>
  );
};

/** Confirmation dialog for deactivating, re-activating, or permanently removing an account. */
export const UserStatusConfirm = ({
  target,
  role,
  onClose,
}: UserStatusConfirmProps) => (
  <Modal
    open={target !== null}
    title={target ? DIALOG_TITLE[target.action] : ''}
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
