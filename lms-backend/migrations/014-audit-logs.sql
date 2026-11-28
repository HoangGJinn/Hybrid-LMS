-- 014-audit-logs.sql
-- Creates the append-only audit_logs table and query indexes for SCRUM-95 (View Edit Log).
-- Idempotent: safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NULL,
  actor_email varchar(255) NULL,
  actor_name varchar(255) NULL,
  actor_role varchar(20) NULL,
  category varchar(20) NOT NULL,
  action varchar(50) NOT NULL,
  result varchar(10) NOT NULL DEFAULT 'SUCCESS',
  entity_type varchar(30) NOT NULL,
  entity_id varchar(100) NULL,
  entity_label varchar(255) NULL,
  parent_type varchar(30) NULL,
  parent_id varchar(100) NULL,
  summary varchar(500) NULL,
  changes jsonb NULL,
  metadata jsonb NULL,
  ip_address varchar(45) NULL,
  user_agent text NULL,
  request_id varchar(64) NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at
  ON audit_logs (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs (entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_parent
  ON audit_logs (parent_type, parent_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON audit_logs (actor_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_category_action
  ON audit_logs (category, action, occurred_at DESC);
