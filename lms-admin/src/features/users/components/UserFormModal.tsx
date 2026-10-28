import { useState, type SyntheticEvent } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { getErrorField, getErrorMessage } from '@/core/api/errors';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { useCreateUser, useUpdateUser } from '../hooks/useUserMutations';
import type {
  ManagedRole,
  ManagedUser,
  UpdateUserPayload,
} from '../types/users.types';
import { ROLE_CONFIG } from '../utils/role-config';
import { STATUS_OPTIONS, isCodeForRole } from '../utils/user-display';

interface FormValues {
  email: string;
  fullName: string;
  code: string;
  status: string;
}
type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_PATTERN = /^(SV|GV)\d{8}$/;
const EMAIL_MAX = 255;
const NAME_MAX = 255;
const HTTP_CONFLICT = 409;

const validate = (
  values: FormValues,
  editing: ManagedUser | null,
  role: ManagedRole,
): FormErrors => {
  const errors: FormErrors = {};
  const email = values.email.trim();
  // The email of a linked account is shown but never sent, so it is not validated.
  if (!editing?.hasLoggedIn) {
    if (!email) errors.email = 'Email is required.';
    else if (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email))
      errors.email = 'Enter a valid email address.';
  }
  const name = values.fullName.trim();
  if (editing && !name) errors.fullName = 'Name is required.';
  else if (name.length > NAME_MAX)
    errors.fullName = `At most ${NAME_MAX} characters.`;

  // Code is permanent once created; only validate on initial account creation
  if (!editing && values.code.trim()) {
    const code = values.code.trim();
    const { codePrefix, codeExample, singular } = ROLE_CONFIG[role];
    if (!CODE_PATTERN.test(code))
      errors.code = `Must be ${codePrefix}yyNNNNNN (e.g. ${codeExample}).`;
    else if (!isCodeForRole(code, role))
      errors.code = `A ${singular} code must start with ${codePrefix} (e.g. ${codeExample}).`;
  }
  return errors;
};

/**
 * Only the fields that differ from the stored user: the API treats every sent field as a change.
 */
const buildUpdatePayload = (
  values: FormValues,
  user: ManagedUser,
): UpdateUserPayload => {
  const payload: UpdateUserPayload = {};
  const email = values.email.trim().toLowerCase();
  const name = values.fullName.trim();
  if (!user.hasLoggedIn && email !== user.email) payload.email = email;
  if (name !== user.fullName) payload.fullName = name;
  if (values.status && values.status !== user.profileStatus)
    payload.status = values.status;
  return payload;
};

const UserForm = ({
  role,
  user,
  onClose,
}: {
  role: ManagedRole;
  user: ManagedUser | null;
  onClose: () => void;
}) => {
  const config = ROLE_CONFIG[role];
  const [values, setValues] = useState<FormValues>(() => ({
    email: user?.email ?? '',
    fullName: user?.fullName ?? '',
    code: user?.code ?? '',
    status: user?.profileStatus ?? '',
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError(null);
  };

  const statusOptions = [...STATUS_OPTIONS[role]];
  if (
    user?.profileStatus &&
    !statusOptions.some((option) => option.value === user.profileStatus)
  ) {
    statusOptions.push({ value: user.profileStatus, label: user.profileStatus });
  }

  const handleError = (error: unknown) => {
    const message = getErrorMessage(error);
    const field = getErrorField(error);
    if (
      isAxiosError(error) &&
      error.response?.status === HTTP_CONFLICT &&
      (field === 'email' || field === 'code')
    ) {
      // Duplicate email or code: keep the dialog open and mark the field the server named.
      setErrors((prev) => ({ ...prev, [field]: message }));
    } else {
      setServerError(message);
    }
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values, user, role);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (user) {
      const payload = buildUpdatePayload(values, user);
      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }
      updateMutation.mutate(
        { id: user.id, payload },
        {
          onSuccess: () => {
            toast.success(`${config.singular} updated.`);
            onClose();
          },
          onError: handleError,
        },
      );
      return;
    }

    const email = values.email.trim().toLowerCase();
    createMutation.mutate(
      {
        email,
        role,
        fullName: values.fullName.trim() || undefined,
        code: values.code.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Account created. ${email} can now sign in with Google.`);
          onClose();
        },
        onError: handleError,
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {serverError && (
        <p
          role="alert"
          className="m-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </p>
      )}

      <Input
        label="Email *"
        type="email"
        value={values.email}
        onChange={(event) => setField('email', event.target.value)}
        error={errors.email}
        hint={
          user
            ? user.hasLoggedIn
              ? 'Linked to a Google account, so the email cannot be changed.'
              : 'Not signed in yet: you can still fix a typo here.'
            : config.createHint
        }
        placeholder={`${config.singular}@school.edu.vn`}
        maxLength={EMAIL_MAX}
        disabled={user?.hasLoggedIn}
        autoFocus={!user}
      />
      <Input
        label={user ? 'Full name *' : 'Full name'}
        value={values.fullName}
        onChange={(event) => setField('fullName', event.target.value)}
        error={errors.fullName}
        hint={
          user
            ? undefined
            : 'Optional. If left empty, the name of the Google account is used at first sign-in.'
        }
        maxLength={NAME_MAX}
        autoFocus={Boolean(user)}
      />
      <Input
        label={config.codeLabel}
        value={values.code}
        onChange={(event) => setField('code', event.target.value)}
        error={errors.code}
        hint={
          user
            ? 'Permanent identity code, cannot be changed.'
            : `Optional. Auto-generated in format ${config.codePrefix}yyNNNNNN if left empty.`
        }
        placeholder={user ? undefined : `e.g. ${config.codeExample}`}
        maxLength={10}
        disabled={Boolean(user)}
      />
      {user && (
        <Select
          label="Status"
          value={values.status}
          onChange={(event) => setField('status', event.target.value)}
          options={statusOptions}
        />
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSaving}>
          {user ? 'Save changes' : config.addLabel}
        </Button>
      </div>
    </form>
  );
};

interface UserFormModalProps {
  open: boolean;
  role: ManagedRole;
  /** The user being edited, or `null` to create a new one. */
  user: ManagedUser | null;
  onClose: () => void;
}

/** Modal dialog to pre-provision an account or edit its name, email and status. */
export const UserFormModal = ({
  open,
  role,
  user,
  onClose,
}: UserFormModalProps) => {
  const config = ROLE_CONFIG[role];
  const title = user
    ? `Edit ${config.singular}`
    : `Add ${config.singular.toLowerCase()}`;

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <UserForm
        key={`${role}-${user?.id ?? 'new'}`}
        role={role}
        user={user}
        onClose={onClose}
      />
    </Modal>
  );
};
