import {
  keepPreviousData,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { downloadBlob } from '@/shared/utils/download';
import { auditService } from '../api/audit.service';
import { auditKeys } from '../api/queryKeys';
import type { AuditLogListParams } from '../types/audit.types';

export const useAuditLogs = (params: AuditLogListParams) =>
  useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditService.getAuditLogs(params),
    placeholderData: keepPreviousData,
  });

export const useRecentAuditLogs = (limit = 8) =>
  useQuery({
    queryKey: auditKeys.recent(limit),
    queryFn: () => auditService.getRecentAuditLogs(limit),
  });

export const useExportAuditLogs = () =>
  useMutation({
    mutationFn: async (params: Omit<AuditLogListParams, 'page' | 'limit'>) => {
      const blob = await auditService.exportAuditLogs(params);
      const dateTag = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `Audit-Logs-${dateTag}.xlsx`);
    },
  });
