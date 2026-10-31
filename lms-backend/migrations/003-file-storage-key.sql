-- ============================================================
-- 003-file-storage-key.sql
-- file_attachments now stores the S3 object key (storage_key) instead of a URL,
-- plus a lifecycle status (PENDING until the upload is confirmed, then READY).
--
-- Rows created before this migration are marked READY. Their storage_key still holds the
-- old file_url value, so backfill it with the real S3 object key before relying on downloads.
--
-- Idempotent: safe to re-run.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_attachments' AND column_name = 'file_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_attachments' AND column_name = 'storage_key'
  ) THEN
    ALTER TABLE file_attachments RENAME COLUMN file_url TO storage_key;
    ALTER TABLE file_attachments ALTER COLUMN storage_key TYPE VARCHAR(500);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'file_attachments_status_enum') THEN
    CREATE TYPE file_attachments_status_enum AS ENUM ('PENDING', 'READY');
  END IF;
END $$;

ALTER TABLE file_attachments
  ADD COLUMN IF NOT EXISTS status file_attachments_status_enum NOT NULL DEFAULT 'READY';

ALTER TABLE file_attachments ALTER COLUMN status SET DEFAULT 'PENDING';

-- Who requested the upload; only the owner may confirm it or attach the file. Legacy rows stay NULL.
ALTER TABLE file_attachments ADD COLUMN IF NOT EXISTS owner_id UUID;
