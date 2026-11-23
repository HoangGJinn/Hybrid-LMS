-- 015-user-last-seen.sql
-- Adds last_seen_at to users for online presence and daily active user tracking (SCRUM-113 Admin Dashboard).
-- Idempotent: safe to re-run (IF NOT EXISTS).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_users_last_seen_at
  ON users (last_seen_at DESC);
