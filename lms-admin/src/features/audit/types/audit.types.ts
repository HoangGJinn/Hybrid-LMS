export type AuditCategory = 'ADMIN' | 'SECURITY';

export type AuditResult = 'SUCCESS' | 'FAILURE';

export type AuditEntityType =
  | 'USER'
  | 'CLASS'
  | 'PARTICIPANT'
  | 'SEMESTER'
  | 'SUBJECT'
  | 'AUTH';

export type AuditAction =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DEACTIVATED'
  | 'USER_ACTIVATED'
  | 'USER_REMOVED'
  | 'CLASS_CREATED'
  | 'CLASS_UPDATED'
  | 'CLASS_DEACTIVATED'
  | 'CLASS_REMOVED'
  | 'CLASS_IMPORTED'
  | 'PARTICIPANT_ADDED'
  | 'PARTICIPANT_REMOVED'
  | 'PARTICIPANTS_BULK_ADDED'
  | 'PARTICIPANTS_BULK_REMOVED'
  | 'PARTICIPANTS_IMPORTED'
  | 'SEMESTER_CREATED'
  | 'SEMESTER_UPDATED'
  | 'SEMESTER_DELETED'
  | 'SUBJECT_CREATED'
  | 'SUBJECT_UPDATED'
  | 'SUBJECT_DELETED'
  | 'LOGIN_SUCCEEDED'
  | 'LOGIN_FAILED'
  | 'LOGIN_BLOCKED'
  | 'LOGOUT'
  | 'REFRESH_TOKEN_REUSED';

export interface AuditFieldChange {
  from: unknown;
  to: unknown;
}

export interface AuditLogItem {
  id: string;
  occurredAt: string;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  actorRole: string | null;
  category: AuditCategory;
  action: AuditAction;
  result: AuditResult;
  entityType: AuditEntityType;
  entityId: string | null;
  entityLabel: string | null;
  parentType: AuditEntityType | null;
  parentId: string | null;
  summary: string | null;
  changes: Record<string, AuditFieldChange> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
}

export interface AuditLogListParams {
  page?: number;
  limit?: number;
  category?: AuditCategory;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  parentId?: string;
  relatedId?: string;
  actorId?: string;
  requestId?: string;
  result?: AuditResult;
  from?: string;
  to?: string;
  search?: string;
}

export type DatePreset = 'all' | 'today' | '7d' | '30d' | 'custom';
