-- UC-31 / UC-32: exams a lecturer creates inside a section.
-- Idempotent: dev databases run with `synchronize`, which may already have created part of this schema.

-- 1. exam_schedules: duration, format and creation time.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_schedules_format_enum') THEN
    CREATE TYPE exam_schedules_format_enum AS ENUM ('MULTIPLE_CHOICE', 'FILE');
  END IF;
END
$$;

ALTER TABLE exam_schedules
  ADD COLUMN IF NOT EXISTS duration_minutes int,
  ADD COLUMN IF NOT EXISTS format exam_schedules_format_enum NOT NULL DEFAULT 'MULTIPLE_CHOICE',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Rows from before this migration: use the old "window = duration" meaning, and keep file exams as FILE.
UPDATE exam_schedules
   SET duration_minutes = GREATEST(1, CEIL(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)::int)
 WHERE duration_minutes IS NULL;
UPDATE exam_schedules SET format = 'FILE' WHERE file_question_id IS NOT NULL;

ALTER TABLE exam_schedules ALTER COLUMN duration_minutes SET NOT NULL;

ALTER TABLE exam_schedules DROP CONSTRAINT IF EXISTS ck_exam_schedules_duration_positive;
ALTER TABLE exam_schedules
  ADD CONSTRAINT ck_exam_schedules_duration_positive CHECK (duration_minutes > 0);

ALTER TABLE exam_schedules DROP CONSTRAINT IF EXISTS ck_exam_schedules_format_matches_file;
ALTER TABLE exam_schedules
  ADD CONSTRAINT ck_exam_schedules_format_matches_file
  CHECK ((format = 'FILE') = (file_question_id IS NOT NULL));

-- A question file belongs to exactly one exam (NULLs are allowed many times).
CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_schedules_file_question
  ON exam_schedules (file_question_id);

-- 2. Multiple-choice questions and their options.
CREATE TABLE IF NOT EXISTS exam_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     uuid NOT NULL REFERENCES exam_schedules (id) ON DELETE CASCADE,
  content     text NOT NULL,
  order_index int  NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_questions_exam_order
  ON exam_questions (exam_id, order_index);

CREATE TABLE IF NOT EXISTS exam_question_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid         NOT NULL REFERENCES exam_questions (id) ON DELETE CASCADE,
  content     varchar(500) NOT NULL,
  is_correct  boolean      NOT NULL DEFAULT false,
  order_index int          NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_question_options_question_order
  ON exam_question_options (question_id, order_index);
-- At most one correct answer per question; "exactly four options" is checked by the service.
CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_question_options_one_correct
  ON exam_question_options (question_id) WHERE is_correct = true;

-- 3. section_items points at the exam it shows (no foreign key, like document_id and assignment_id).
ALTER TABLE section_items ADD COLUMN IF NOT EXISTS exam_id uuid;

-- 4. Empty EXAM items created by the old "Exam" button point at nothing; they cannot be opened, so drop them.
DELETE FROM section_items WHERE item_type = 'EXAM' AND exam_id IS NULL;
