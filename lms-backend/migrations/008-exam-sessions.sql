-- Student exam taking: lecturer attempt/result/shuffle settings, one IN_PROGRESS session per student,
-- and per-session multiple-choice answers.
-- Idempotent so dev databases running with `synchronize` can also execute it safely.

-- 1. Lecturer settings on exam_schedules: max_attempts (NULL = unlimited), show_results, shuffle_questions, shuffle_options.
ALTER TABLE exam_schedules
  ADD COLUMN IF NOT EXISTS max_attempts      int     NULL,
  ADD COLUMN IF NOT EXISTS show_results      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shuffle_questions boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shuffle_options   boolean NOT NULL DEFAULT false;

ALTER TABLE exam_schedules DROP CONSTRAINT IF EXISTS ck_exam_schedules_max_attempts_positive;
ALTER TABLE exam_schedules
  ADD CONSTRAINT ck_exam_schedules_max_attempts_positive
  CHECK (max_attempts IS NULL OR max_attempts >= 1);

-- 2. At most one IN_PROGRESS session per (exam_schedule_id, student_id); multiple COMPLETED attempts are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_sessions_one_in_progress
  ON exam_sessions (exam_schedule_id, student_id)
  WHERE status = 'IN_PROGRESS';

CREATE INDEX IF NOT EXISTS idx_exam_sessions_schedule_student
  ON exam_sessions (exam_schedule_id, student_id, started_at);

-- 3. Saved multiple-choice answers for each exam attempt.
CREATE TABLE IF NOT EXISTS exam_session_answers (
  exam_session_id    uuid        NOT NULL REFERENCES exam_sessions (id) ON DELETE CASCADE,
  question_id        uuid        NOT NULL REFERENCES exam_questions (id) ON DELETE CASCADE,
  selected_option_id uuid        NOT NULL REFERENCES exam_question_options (id) ON DELETE CASCADE,
  answered_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_session_id, question_id)
);

-- 4. File-based exam submission & lecturer grading fields on exam_sessions.
ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS comment      text        NULL,
  ADD COLUMN IF NOT EXISTS graded_at    timestamptz NULL;

-- 5. Attached student submission files for FILE exams.
CREATE TABLE IF NOT EXISTS exam_session_files (
  exam_session_id uuid NOT NULL REFERENCES exam_sessions (id) ON DELETE CASCADE,
  file_id         uuid NOT NULL REFERENCES file_attachments (id) ON DELETE CASCADE,
  PRIMARY KEY (exam_session_id, file_id)
);


