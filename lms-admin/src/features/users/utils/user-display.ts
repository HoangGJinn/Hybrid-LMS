import type { BadgeProps } from '@/shared/components/ui/Badge';
import { ROLE_CONFIG } from './role-config';
import type {
  AccountFilter,
  AccountState,
  ManagedRole,
  ManagedUser,
} from '../types/users.types';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

export interface StatusOption {
  value: string;
  label: string;
}

/** Profile statuses an admin can pick, per role. Values match the backend enums. */
export const STATUS_OPTIONS: Record<ManagedRole, StatusOption[]> = {
  STUDENT: [
    { value: 'STUDYING', label: 'Studying' },
    { value: 'GRADUATED', label: 'Graduated' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'RESERVED', label: 'Reserved' },
  ],
  LECTURER: [
    { value: 'WORKING', label: 'Working' },
    { value: 'ON_LEAVE', label: 'On leave' },
    { value: 'RESIGNED', label: 'Resigned' },
  ],
};

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  STUDYING: 'success',
  WORKING: 'success',
  RESERVED: 'warning',
  ON_LEAVE: 'warning',
  SUSPENDED: 'destructive',
  RESIGNED: 'destructive',
  GRADUATED: 'outline',
};

export const getAccountState = (user: ManagedUser): AccountState => {
  if (!user.isActive) return 'inactive';
  return user.hasLoggedIn ? 'active' : 'pending';
};

export const ACCOUNT_STATE_BADGES: Record<
  AccountState,
  { label: string; variant: BadgeVariant; hint: string }
> = {
  pending: {
    label: 'Pending',
    variant: 'warning',
    hint: 'Has not signed in yet. The account is linked at the first Google sign-in with this email.',
  },
  active: { label: 'Active', variant: 'success', hint: 'Can sign in.' },
  inactive: {
    label: 'Inactive',
    variant: 'default',
    hint: 'Deactivated: cannot sign in or use the API.',
  },
};

/** Readable label of a profile status ("ON_LEAVE" → "On leave"); "—" when there is none. */
export const getStatusLabel = (
  role: ManagedRole,
  status: string | null,
): string => {
  if (!status) return '—';
  return STATUS_OPTIONS[role].find((option) => option.value === status)?.label ?? status;
};

export const getStatusVariant = (status: string | null): BadgeVariant =>
  (status && STATUS_VARIANTS[status]) || 'default';

/** `isActive` query value of an account filter; undefined = no filter. Pending accounts are active ones. */
export const toIsActive = (filter: AccountFilter): boolean | undefined => {
  if (filter === 'active' || filter === 'pending') return true;
  if (filter === 'inactive') return false;
  return undefined;
};

/**
 * `hasLoggedIn` query value of an account filter, so that each filter matches its badge:
 * Active = signed in, Pending = never signed in. Undefined = no filter.
 */
export const toHasLoggedIn = (filter: AccountFilter): boolean | undefined => {
  if (filter === 'active') return true;
  if (filter === 'pending') return false;
  return undefined;
};

/** A student code starts with SV and a lecturer code with GV; the same rule as the backend. */
export const isCodeForRole = (code: string, role: ManagedRole): boolean =>
  code.startsWith(ROLE_CONFIG[role].codePrefix);
