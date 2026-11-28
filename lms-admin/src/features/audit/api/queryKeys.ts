import type { AuditLogListParams } from '../types/audit.types';

export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (params: AuditLogListParams) => [...auditKeys.lists(), params] as const,
  detail: (id: string) => [...auditKeys.all, 'detail', id] as const,
  recent: (limit: number) => [...auditKeys.all, 'recent', limit] as const,
};
