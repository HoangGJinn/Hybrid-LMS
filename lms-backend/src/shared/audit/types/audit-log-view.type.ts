import type { AuditLog } from '../entities/audit-log.entity.js';
import type { AuditAction } from '../enums/audit-action.enum.js';
import type { AuditCategory } from '../enums/audit-category.enum.js';
import type { AuditEntityType } from '../enums/audit-entity-type.enum.js';
import type { AuditResult } from '../enums/audit-result.enum.js';
import type { FieldChanges } from '../utils/diff.util.js';

export class AuditLogView {
  id: string;
  occurredAt: Date;
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
  changes: FieldChanges | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;

  static fromEntity(entity: AuditLog): AuditLogView {
    const view = new AuditLogView();
    view.id = entity.id;
    view.occurredAt = entity.occurredAt;
    view.actorId = entity.actorId;
    view.actorEmail = entity.actorEmail;
    view.actorName = entity.actorName;
    view.actorRole = entity.actorRole;
    view.category = entity.category;
    view.action = entity.action;
    view.result = entity.result;
    view.entityType = entity.entityType;
    view.entityId = entity.entityId;
    view.entityLabel = entity.entityLabel;
    view.parentType = entity.parentType;
    view.parentId = entity.parentId;
    view.summary = entity.summary;
    view.changes = entity.changes;
    view.metadata = entity.metadata;
    view.ipAddress = entity.ipAddress;
    view.userAgent = entity.userAgent;
    view.requestId = entity.requestId;
    return view;
  }
}
