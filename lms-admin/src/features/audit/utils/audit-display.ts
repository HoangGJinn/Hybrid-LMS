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
  USER_CREATED: { label: 'User created', category: 'ADMIN', variant: 'success' },
  USER_UPDATED: { label: 'User updated', category: 'ADMIN', variant: 'outline' },
  USER_DEACTIVATED: { label: 'User deactivated', category: 'ADMIN', variant: 'warning' },
  USER_ACTIVATED: { label: 'User activated', category: 'ADMIN', variant: 'success' },
  USER_REMOVED: { label: 'User removed', category: 'ADMIN', variant: 'destructive' },

  CLASS_CREATED: { label: 'Course created', category: 'ADMIN', variant: 'success' },
  CLASS_UPDATED: { label: 'Course updated', category: 'ADMIN', variant: 'outline' },
  CLASS_DEACTIVATED: { label: 'Course ended', category: 'ADMIN', variant: 'warning' },
  CLASS_REMOVED: { label: 'Course removed', category: 'ADMIN', variant: 'destructive' },
  CLASS_IMPORTED: { label: 'Courses imported', category: 'ADMIN', variant: 'success' },

  PARTICIPANT_ADDED: { label: 'Participant added', category: 'ADMIN', variant: 'success' },
  PARTICIPANT_REMOVED: { label: 'Participant removed', category: 'ADMIN', variant: 'destructive' },
  PARTICIPANTS_BULK_ADDED: { label: 'Participants bulk added', category: 'ADMIN', variant: 'success' },
  PARTICIPANTS_BULK_REMOVED: { label: 'Participants bulk removed', category: 'ADMIN', variant: 'destructive' },
  PARTICIPANTS_IMPORTED: { label: 'Participants imported', category: 'ADMIN', variant: 'success' },

  SEMESTER_CREATED: { label: 'Semester created', category: 'ADMIN', variant: 'success' },
  SEMESTER_UPDATED: { label: 'Semester updated', category: 'ADMIN', variant: 'outline' },
  SEMESTER_DELETED: { label: 'Semester deleted', category: 'ADMIN', variant: 'destructive' },

  SUBJECT_CREATED: { label: 'Subject created', category: 'ADMIN', variant: 'success' },
  SUBJECT_UPDATED: { label: 'Subject updated', category: 'ADMIN', variant: 'outline' },
  SUBJECT_DELETED: { label: 'Subject deleted', category: 'ADMIN', variant: 'destructive' },

  LOGIN_SUCCEEDED: { label: 'Sign-in succeeded', category: 'SECURITY', variant: 'default' },
  LOGIN_FAILED: { label: 'Sign-in failed', category: 'SECURITY', variant: 'destructive' },
  LOGIN_BLOCKED: { label: 'Sign-in blocked', category: 'SECURITY', variant: 'destructive' },
  LOGOUT: { label: 'Signed out', category: 'SECURITY', variant: 'outline' },
  REFRESH_TOKEN_REUSED: { label: 'Token reuse detected', category: 'SECURITY', variant: 'destructive' },
};

export const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  USER: 'User',
  CLASS: 'Course',
  PARTICIPANT: 'Participant',
  SEMESTER: 'Semester',
  SUBJECT: 'Subject',
  AUTH: 'Auth',
};

export const CATEGORY_LABELS: Record<AuditCategory, string> = {
  ADMIN: 'Admin',
  SECURITY: 'Security',
};

const VN_PARTS_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const getActionMeta = (action: AuditAction): ActionMeta =>
  ACTION_META[action] ?? { label: action, category: 'ADMIN', variant: 'default' };

/** Semantic dot class prioritizing explicit FAILURE outcome before action tone. */
export const getActionDotTone = (
  item: Pick<AuditLogItem, 'action' | 'result'>,
): string => {
  if (item.result === 'FAILURE') return 'bg-destructive';
  const { variant } = getActionMeta(item.action);
  if (variant === 'destructive') return 'bg-destructive';
  if (variant === 'warning') return 'bg-warning';
  if (variant === 'success') return 'bg-success';
  if (item.action === 'LOGIN_SUCCEEDED') return 'bg-brand';
  return 'bg-muted-foreground/50';
};

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

/** Formats a Date as YYYY-MM-DD in Vietnam time (Asia/Ho_Chi_Minh) for stable query cache keys. */
export const formatVnDateKey = (date: Date): string => {
  const parts = VN_PARTS_FORMATTER.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
};

/**
 * Returns deterministic YYYY-MM-DD start boundaries in Vietnam timezone without a volatile
 * millisecond `to` bound, keeping TanStack Query keys stable across component renders.
 */
export const getDatePresetRange = (
  preset: Exclude<DatePreset, 'custom'>,
  now: Date = new Date(),
): { from?: string; to?: string } => {
  if (preset === 'all') return {};
  if (preset === 'today') {
    return { from: formatVnDateKey(now) };
  }
  const daysBack = preset === '7d' ? 6 : 29;
  const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return { from: formatVnDateKey(start) };
};

const BROWSER_PATTERNS: readonly [RegExp, string][] = [
  [/Edg\/(\d+)/, 'Edge'],
  [/OPR\/(\d+)/, 'Opera'],
  [/Chrome\/(\d+)/, 'Chrome'],
  [/Firefox\/(\d+)/, 'Firefox'],
  [/Version\/(\d+(?:\.\d+)?).*Safari\//, 'Safari'],
  [/PostmanRuntime\/(\d+(?:\.\d+)?)/, 'Postman'],
  [/curl\/(\d+(?:\.\d+)?)/, 'curl'],
  [/axios\/(\d+(?:\.\d+)?)/i, 'Axios'],
];

const OS_PATTERNS: readonly [RegExp, string][] = [
  [/Windows NT/i, 'Windows'],
  [/Android/i, 'Android'],
  [/iPhone|iPad|iPod/i, 'iOS'],
  [/Mac OS X|Macintosh/i, 'macOS'],
  [/Linux/i, 'Linux'],
];

/** Extracts a concise "Browser on OS" summary from a raw User-Agent header. */
export const summarizeUserAgent = (
  userAgent: string | null | undefined,
): string | null => {
  const trimmed = userAgent?.trim();
  if (!trimmed) return null;

  let browserLabel: string | null = null;
  for (const [pattern, name] of BROWSER_PATTERNS) {
    const match = pattern.exec(trimmed);
    if (match) {
      browserLabel = match[1] ? `${name} ${match[1]}` : name;
      break;
    }
  }

  let osLabel: string | null = null;
  for (const [pattern, name] of OS_PATTERNS) {
    if (pattern.test(trimmed)) {
      osLabel = name;
      break;
    }
  }

  if (browserLabel && osLabel) return `${browserLabel} on ${osLabel}`;
  if (browserLabel) return browserLabel;
  if (osLabel) return osLabel;
  return trimmed.length > 56 ? `${trimmed.slice(0, 56)}…` : trimmed;
};
