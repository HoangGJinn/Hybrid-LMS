import type { BadgeProps } from '@/shared/components/ui/Badge';
import type {
  AuditAction,
  AuditCategory,
  AuditEntityType,
  AuditLogItem,
  DatePreset,
} from '../types/audit.types';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

export interface ActionMeta {
  label: string;
  category: AuditCategory;
  variant: BadgeVariant;
}

export const ACTION_META: Record<AuditAction, ActionMeta> = {
  USER_CREATED: { label: 'User Created', category: 'ADMIN', variant: 'success' },
  USER_UPDATED: { label: 'User Updated', category: 'ADMIN', variant: 'outline' },
  USER_DEACTIVATED: { label: 'User Deactivated', category: 'ADMIN', variant: 'warning' },
  USER_ACTIVATED: { label: 'User Activated', category: 'ADMIN', variant: 'success' },
  USER_REMOVED: { label: 'User Removed', category: 'ADMIN', variant: 'destructive' },

  CLASS_CREATED: { label: 'Course Created', category: 'ADMIN', variant: 'success' },
  CLASS_UPDATED: { label: 'Course Updated', category: 'ADMIN', variant: 'outline' },
  CLASS_DEACTIVATED: { label: 'Course Ended', category: 'ADMIN', variant: 'warning' },
  CLASS_REMOVED: { label: 'Course Removed', category: 'ADMIN', variant: 'destructive' },
  CLASS_IMPORTED: { label: 'Courses Imported', category: 'ADMIN', variant: 'success' },

  PARTICIPANT_ADDED: { label: 'Participant Added', category: 'ADMIN', variant: 'success' },
  PARTICIPANT_REMOVED: { label: 'Participant Removed', category: 'ADMIN', variant: 'destructive' },
  PARTICIPANTS_BULK_ADDED: { label: 'Bulk Added Participants', category: 'ADMIN', variant: 'success' },
  PARTICIPANTS_BULK_REMOVED: { label: 'Bulk Removed Participants', category: 'ADMIN', variant: 'destructive' },
  PARTICIPANTS_IMPORTED: { label: 'Participants Imported', category: 'ADMIN', variant: 'success' },

  SEMESTER_CREATED: { label: 'Semester Created', category: 'ADMIN', variant: 'success' },
  SEMESTER_UPDATED: { label: 'Semester Updated', category: 'ADMIN', variant: 'outline' },
  SEMESTER_DELETED: { label: 'Semester Deleted', category: 'ADMIN', variant: 'destructive' },

  SUBJECT_CREATED: { label: 'Subject Created', category: 'ADMIN', variant: 'success' },
  SUBJECT_UPDATED: { label: 'Subject Updated', category: 'ADMIN', variant: 'outline' },
  SUBJECT_DELETED: { label: 'Subject Deleted', category: 'ADMIN', variant: 'destructive' },

  LOGIN_SUCCEEDED: { label: 'Login Succeeded', category: 'SECURITY', variant: 'default' },
  LOGIN_FAILED: { label: 'Login Failed', category: 'SECURITY', variant: 'destructive' },
  LOGIN_BLOCKED: { label: 'Login Blocked', category: 'SECURITY', variant: 'destructive' },
  LOGOUT: { label: 'Logout', category: 'SECURITY', variant: 'outline' },
  REFRESH_TOKEN_REUSED: { label: 'Token Reuse Detected', category: 'SECURITY', variant: 'destructive' },
};

export const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  USER: 'User',
  CLASS: 'Course',
  PARTICIPANT: 'Participant',
  SEMESTER: 'Semester',
  SUBJECT: 'Subject',
  AUTH: 'Auth',
};

export const getActionMeta = (action: AuditAction): ActionMeta =>
  ACTION_META[action] ?? { label: action, category: 'ADMIN', variant: 'default' };

export const getActionsForCategory = (
  category?: AuditCategory,
): { value: AuditAction; label: string }[] =>
  (Object.entries(ACTION_META) as [AuditAction, ActionMeta][])
    .filter(([, meta]) => !category || meta.category === category)
    .map(([value, meta]) => ({ value, label: meta.label }));

export const getTargetLink = (item: AuditLogItem): string | null => {
  if (item.entityType === 'CLASS' && item.entityId) {
    return `/courses/${item.entityId}`;
  }
  if (item.entityType === 'PARTICIPANT' && item.parentId) {
    return `/courses/${item.parentId}/participants`;
  }
  if (item.entityType === 'USER') {
    const role = item.metadata?.role;
    if (role === 'STUDENT') return '/students';
    if (role === 'LECTURER') return '/lecturers';
  }
  return null;
};

export const formatChangeValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const getDatePresetRange = (
  preset: Exclude<DatePreset, 'custom'>,
  now: Date = new Date(),
): { from?: string; to?: string } => {
  if (preset === 'all') return {};
  const to = now.toISOString();
  if (preset === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to };
  }
  const days = preset === '7d' ? 7 : 30;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: start.toISOString(), to };
};
