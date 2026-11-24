-- Adds support for multiple-answer multiple-choice questions and cloze fill-in-the-blank questions.
-- Idempotent so dev databases running with `synchronize` can also execute it safely.

-- 1. Question type enum (matches TypeORM default `<table_name>_<column_name>_enum` naming).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_questions_type_enum') THEN
    CREATE TYPE exam_questions_type_enum AS ENUM ('MULTIPLE_CHOICE', 'FILL_IN_THE_BLANK');
  END IF;
END
$$;

-- 2. Extend exam_questions with question type and required correct/blank count.
ALTER TABLE exam_questions
  ADD COLUMN IF NOT EXISTS type exam_questions_type_enum NOT NULL DEFAULT 'MULTIPLE_CHOICE',
  ADD COLUMN IF NOT EXISTS correct_count int NOT NULL DEFAULT 1;

ALTER TABLE exam_questions DROP CONSTRAINT IF EXISTS ck_exam_questions_correct_count_positive;
ALTER TABLE exam_questions
  ADD CONSTRAINT ck_exam_questions_correct_count_positive
  CHECK (correct_count >= 1);

-- 3. Allow multiple correct options (or multiple blanks) per question.
DROP INDEX IF EXISTS uq_exam_question_options_one_correct;

-- 4. Extend exam_session_answers for multi-select MCQ and fill-in-the-blank text answers.
ALTER TABLE exam_session_answers
  ALTER COLUMN selected_option_id DROP NOT NULL;

ALTER TABLE exam_session_answers
  ADD COLUMN IF NOT EXISTS selected_option_ids jsonb NULL,
  ADD COLUMN IF NOT EXISTS text_answers jsonb NULL;

UPDATE exam_session_answers
   SET selected_option_ids = jsonb_build_array(selected_option_id)
 WHERE selected_option_id IS NOT NULL
   AND selected_option_ids IS NULL;
