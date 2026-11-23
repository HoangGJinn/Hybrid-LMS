import { apiClient } from '@/core/api/client';
import { get } from '@/core/api/http';
import type { PaginatedResult } from '@/core/types/pagination.types';
import type { AuditLogItem, AuditLogListParams } from '../types/audit.types';

export const auditService = {
  getAuditLogs: (
    params: AuditLogListParams,
  ): Promise<PaginatedResult<AuditLogItem>> =>
    get<PaginatedResult<AuditLogItem>>('/api/audit-logs', params),

  getAuditLog: (id: string): Promise<AuditLogItem> =>
    get<AuditLogItem>(`/api/audit-logs/${id}`),

  getRecentAuditLogs: (limit = 8): Promise<AuditLogItem[]> =>
    get<AuditLogItem[]>('/api/audit-logs/recent', { limit }),

  exportAuditLogs: async (
    params: Omit<AuditLogListParams, 'page' | 'limit'>,
  ): Promise<Blob> => {
    const response = await apiClient.get<Blob>('/api/audit-logs/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
