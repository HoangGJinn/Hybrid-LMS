import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/types/paginated-result.type.js';
import { emptyToUndefined } from '../../../common/utils/string.util.js';
import { safeFileName, type ExportedFile } from '../../excel/workbook.util.js';
import { getAuditContext } from '../context/audit-context.js';
import {
  DEFAULT_AUDIT_LIMIT,
  DEFAULT_AUDIT_PAGE,
  type ListAuditLogsQueryDto,
} from '../dto/list-audit-logs-query.dto.js';
import { AuditResult } from '../enums/audit-result.enum.js';
import {
  AuditLogRepository,
  type AuditLogFilters,
} from '../repositories/audit-log.repository.js';
import { AuditLogView } from '../types/audit-log-view.type.js';
import type { RecordAuditInput } from '../types/record-audit-input.type.js';
import { buildAuditLogsWorkbook } from '../utils/audit-log-export.builder.js';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_RECENT_LIMIT = 8;
const MAX_RECENT_LIMIT = 50;

const parseFromDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  return new Date(value);
};

const parseToDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  if (DATE_ONLY_PATTERN.test(value)) {
    return new Date(`${value}T23:59:59.999Z`);
  }
  return new Date(value);
};

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly auditRepo: AuditLogRepository) {}

  /**
   * Appends a single audit record. Merges request context (IP, UA, requestId, actor) from
   * AsyncLocalStorage and never throws so audit logging never breaks the primary operation.
   */
  async record(input: RecordAuditInput): Promise<void> {
    try {
      const ctx = getAuditContext();
      const actor = input.actor ?? ctx?.actor;
      const actorId = actor?.id ?? null;
      let actorName = actor?.fullName ?? null;
      if (!actorName && actorId) {
        actorName = await this.auditRepo.findActorName(actorId);
      }

      await this.auditRepo.insert({
        actorId,
        actorEmail: actor?.email ?? null,
        actorName,
        actorRole: actor?.role ?? null,
        category: input.category,
        action: input.action,
        result: input.result ?? AuditResult.SUCCESS,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel?.slice(0, 255) ?? null,
        parentType: input.parentType ?? null,
        parentId: input.parentId ?? null,
        summary: input.summary?.slice(0, 500) ?? null,
        changes: input.changes ?? null,
        metadata: input.metadata ?? null,
        ipAddress: ctx?.ipAddress ?? null,
        userAgent: ctx?.userAgent ?? null,
        requestId: ctx?.requestId ?? null,
      });
    } catch (error) {
      this.logger.error('Failed to write audit log entry', error as Error);
    }
  }

  async list(
    query: ListAuditLogsQueryDto,
  ): Promise<PaginatedResult<AuditLogView>> {
    const page = query.page ?? DEFAULT_AUDIT_PAGE;
    const limit = query.limit ?? DEFAULT_AUDIT_LIMIT;
    const [rows, total] = await this.auditRepo.findPage({
      ...this.toFilters(query),
      page,
      limit,
    });
    return PaginatedResult.of(
      rows.map((row) => AuditLogView.fromEntity(row)),
      total,
      page,
      limit,
    );
  }

  async getById(id: string): Promise<AuditLogView> {
    const row = await this.auditRepo.findById(id);
    if (!row) throw new NotFoundException(`Audit log #${id} not found`);
    return AuditLogView.fromEntity(row);
  }

  async getRecent(
    limit: number = DEFAULT_RECENT_LIMIT,
  ): Promise<AuditLogView[]> {
    const bounded = Math.min(Math.max(limit, 1), MAX_RECENT_LIMIT);
    const rows = await this.auditRepo.findRecent(bounded);
    return rows.map((row) => AuditLogView.fromEntity(row));
  }

  async exportExcel(query: ListAuditLogsQueryDto): Promise<ExportedFile> {
    const rows = await this.auditRepo.findForExport(this.toFilters(query));
    const dateTag = new Date().toISOString().slice(0, 10);
    return {
      fileName: `${safeFileName(`Audit-Logs-${dateTag}`)}.xlsx`,
      buffer: await buildAuditLogsWorkbook(rows),
    };
  }

  private toFilters(
    query: ListAuditLogsQueryDto,
  ): Omit<AuditLogFilters, 'page' | 'limit'> {
    return {
      category: query.category,
      action: query.action,
      entityType: query.entityType,
      entityId: emptyToUndefined(query.entityId),
      parentId: emptyToUndefined(query.parentId),
      relatedId: emptyToUndefined(query.relatedId),
      actorId: emptyToUndefined(query.actorId),
      result: query.result,
      from: parseFromDate(query.from),
      to: parseToDate(query.to),
      search: emptyToUndefined(query.search),
    };
  }
}
