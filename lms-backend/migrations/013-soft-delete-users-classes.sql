-- 013-soft-delete-users-classes.sql
-- Adds permanent soft-delete (tombstone) columns to users and classes for SCRUM-87, SCRUM-93, and SCRUM-95 (Audit Log).
-- Idempotent: safe to re-run (IF NOT EXISTS).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid NULL;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid NULL;
