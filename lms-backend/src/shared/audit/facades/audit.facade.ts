import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../services/audit-log.service.js';
import type { RecordAuditInput } from '../types/record-audit-input.type.js';

/** Facade exposed globally to domain modules for recording append-only audit events. */
@Injectable()
export class AuditFacade {
  constructor(private readonly auditLogService: AuditLogService) {}

  async record(input: RecordAuditInput): Promise<void> {
    await this.auditLogService.record(input);
  }
}
