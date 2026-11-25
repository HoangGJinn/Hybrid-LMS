import type { AuditActor } from '../context/audit-context.js';
import type { AuditAction } from '../enums/audit-action.enum.js';
import type { AuditCategory } from '../enums/audit-category.enum.js';
import type { AuditEntityType } from '../enums/audit-entity-type.enum.js';
import type { AuditResult } from '../enums/audit-result.enum.js';
import type { FieldChanges } from '../utils/diff.util.js';

export interface RecordAuditInput {
  readonly category: AuditCategory;
  readonly action: AuditAction;
  readonly result?: AuditResult;
  readonly entityType: AuditEntityType;
  readonly entityId?: string | null;
  readonly entityLabel?: string | null;
  readonly parentType?: AuditEntityType | null;
  readonly parentId?: string | null;
  readonly summary?: string | null;
  readonly changes?: FieldChanges | null;
  readonly metadata?: Record<string, unknown> | null;
  /** Explicit actor override (e.g. login attempts before req.user is populated). */
  readonly actor?: AuditActor;
}
