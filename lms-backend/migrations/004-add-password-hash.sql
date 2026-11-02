-- ============================================================
-- 004-add-password-hash.sql
-- Adds password_hash column to users table for username/password authentication.
-- Google SSO users retain NULL for this column.
--
-- Idempotent: safe to re-run.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
  END IF;
END $$;

