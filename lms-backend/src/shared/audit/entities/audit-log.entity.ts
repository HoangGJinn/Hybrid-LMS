import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditAction } from '../enums/audit-action.enum.js';
import { AuditCategory } from '../enums/audit-category.enum.js';
import { AuditEntityType } from '../enums/audit-entity-type.enum.js';
import { AuditResult } from '../enums/audit-result.enum.js';
import type { FieldChanges } from '../utils/diff.util.js';

/** Append-only audit trail entry (no foreign keys so logs survive entity/user removal). */
@Index('idx_audit_logs_occurred_at', ['occurredAt'])
@Index('idx_audit_logs_entity', ['entityType', 'entityId', 'occurredAt'])
@Index('idx_audit_logs_parent', ['parentType', 'parentId', 'occurredAt'])
@Index('idx_audit_logs_actor', ['actorId', 'occurredAt'])
@Index('idx_audit_logs_category_action', ['category', 'action', 'occurredAt'])
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @CreateDateColumn({ name: 'occurred_at', type: 'timestamptz' })
  readonly occurredAt: Date;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_email', type: 'varchar', length: 255, nullable: true })
  actorEmail: string | null;

  @Column({ name: 'actor_name', type: 'varchar', length: 255, nullable: true })
  actorName: string | null;

  @Column({ name: 'actor_role', type: 'varchar', length: 20, nullable: true })
  actorRole: string | null;

  @Column({ type: 'varchar', length: 20 })
  category: AuditCategory;

  @Column({ type: 'varchar', length: 50 })
  action: AuditAction;

  @Column({ type: 'varchar', length: 10, default: AuditResult.SUCCESS })
  result: AuditResult;

  @Column({ name: 'entity_type', type: 'varchar', length: 30 })
  entityType: AuditEntityType;

  @Column({ name: 'entity_id', type: 'varchar', length: 100, nullable: true })
  entityId: string | null;

  @Column({ name: 'entity_label', type: 'varchar', length: 255, nullable: true })
  entityLabel: string | null;

  @Column({ name: 'parent_type', type: 'varchar', length: 30, nullable: true })
  parentType: AuditEntityType | null;

  @Column({ name: 'parent_id', type: 'varchar', length: 100, nullable: true })
  parentId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  summary: string | null;

  @Column({ type: 'jsonb', nullable: true })
  changes: FieldChanges | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'request_id', type: 'varchar', length: 64, nullable: true })
  requestId: string | null;
}
