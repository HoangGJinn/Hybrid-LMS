-- Question Bank, Quiz Instances, and Knowledge Component schema updates.
-- Idempotent: safe to run multiple times on remote databases where TypeORM synchronize is off.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_import_batches_status_enum') THEN
    CREATE TYPE question_import_batches_status_enum AS ENUM ('PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'questions_source_enum') THEN
    CREATE TYPE questions_source_enum AS ENUM ('LECTURER_UPLOAD', 'AI_GENERATED', 'MANUAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'questions_difficulty_enum') THEN
    CREATE TYPE questions_difficulty_enum AS ENUM ('EASY', 'MEDIUM', 'HARD');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'questions_review_status_enum') THEN
    CREATE TYPE questions_review_status_enum AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type_enum') THEN
    CREATE TYPE question_type_enum AS ENUM ('MULTIPLE_CHOICE', 'FILL_BLANK');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_knowledge_components_assigned_by_enum') THEN
    CREATE TYPE question_knowledge_components_assigned_by_enum AS ENUM ('LECTURER', 'AI');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_instances_generation_strategy_enum') THEN
    CREATE TYPE quiz_instances_generation_strategy_enum AS ENUM ('WEAK_KC', 'SPACED_REVIEW', 'MIXED', 'CUSTOM_KC');
  END IF;
END
$$;

ALTER TYPE generation_jobs_status_enum ADD VALUE IF NOT EXISTS 'RUNNING';
ALTER TYPE quiz_instances_status_enum ADD VALUE IF NOT EXISTS 'EXPIRED';

-- 2. knowledge_components: link to subject and add kt_concept_idx
DO $$
DECLARE
  con_name text;
BEGIN
  FOR con_name IN
    SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
     WHERE t.relname = 'knowledge_components'
       AND c.contype = 'u'
       AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format('ALTER TABLE knowledge_components DROP CONSTRAINT IF EXISTS %I', con_name);
  END LOOP;
END
$$;

ALTER TABLE knowledge_components
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES subjects (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS kt_concept_idx integer;

CREATE UNIQUE INDEX IF NOT EXISTS uq_knowledge_components_subject_name
  ON knowledge_components (subject_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_knowledge_components_subject_kt_idx
  ON knowledge_components (subject_id, kt_concept_idx);

-- 3. generation_jobs: add subject_id, requested_by, document_id, num_requested, num_generated
ALTER TABLE generation_jobs
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES subjects (id),
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES lecturers (user_id),
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES documents (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS num_requested integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS num_generated integer NOT NULL DEFAULT 0;

-- 4. Drop obsolete question_distractions table
DROP TABLE IF EXISTS question_distractions CASCADE;

-- 5. question_import_batches
CREATE TABLE IF NOT EXISTS question_import_batches (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id   uuid NOT NULL REFERENCES subjects (id),
  uploaded_by  uuid NOT NULL REFERENCES lecturers (user_id),
  file_id      uuid NOT NULL REFERENCES file_attachments (id),
  status       question_import_batches_status_enum NOT NULL DEFAULT 'PROCESSING',
  total_rows   integer NOT NULL DEFAULT 0,
  success_rows integer NOT NULL DEFAULT 0,
  failed_rows  integer NOT NULL DEFAULT 0,
  error_report jsonb NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 6. questions
CREATE TABLE IF NOT EXISTS questions (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id        uuid NOT NULL REFERENCES subjects (id),
  source            questions_source_enum NOT NULL,
  import_batch_id   uuid NULL REFERENCES question_import_batches (id) ON DELETE SET NULL,
  generation_job_id uuid NULL REFERENCES generation_jobs (id) ON DELETE SET NULL,
  segment_id        uuid NULL REFERENCES document_text_segments (id) ON DELETE SET NULL,
  question_text     text NOT NULL,
  difficulty        questions_difficulty_enum NOT NULL,
  explanation       text NULL,
  review_status     questions_review_status_enum NOT NULL DEFAULT 'PENDING_REVIEW',
  reviewed_by       uuid NULL REFERENCES lecturers (user_id),
  content_hash      varchar(64) NOT NULL,
  kt_question_idx   SERIAL NOT NULL UNIQUE,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  question_type     question_type_enum NOT NULL DEFAULT 'MULTIPLE_CHOICE',
  xes_question_id   integer NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_questions_subject_content_hash
  ON questions (subject_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_questions_xes_question_id
  ON questions (xes_question_id);

-- 7. question_options
CREATE TABLE IF NOT EXISTS question_options (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id       uuid NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  option_label      varchar(5) NOT NULL,
  option_text       text NOT NULL,
  is_correct        boolean NOT NULL DEFAULT false,
  generation_method varchar(50) NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_question_options_question_label
  ON question_options (question_id, option_label);

-- 8. question_knowledge_components
CREATE TABLE IF NOT EXISTS question_knowledge_components (
  question_id uuid NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  kc_id       uuid NOT NULL REFERENCES knowledge_components (id) ON DELETE CASCADE,
  assigned_by question_knowledge_components_assigned_by_enum NOT NULL,
  PRIMARY KEY (question_id, kc_id)
);

-- 9. quiz_instances: migrate to question-bank-backed schema
ALTER TABLE quiz_instances
  DROP COLUMN IF EXISTS generation_job_id,
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES subjects (id),
  ADD COLUMN IF NOT EXISTS model_version_id uuid NULL,
  ADD COLUMN IF NOT EXISTS title varchar(255) NOT NULL DEFAULT 'Practice Quiz',
  ADD COLUMN IF NOT EXISTS correct_count integer NULL,
  ADD COLUMN IF NOT EXISTS started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'quiz_instances'
       AND column_name = 'generation_strategy'
       AND data_type = 'character varying'
  ) THEN
    ALTER TABLE quiz_instances
      ALTER COLUMN generation_strategy TYPE quiz_instances_generation_strategy_enum
      USING (
        CASE generation_strategy
          WHEN 'WEAK_KC' THEN 'WEAK_KC'::quiz_instances_generation_strategy_enum
          WHEN 'SPACED_REVIEW' THEN 'SPACED_REVIEW'::quiz_instances_generation_strategy_enum
          WHEN 'CUSTOM_KC' THEN 'CUSTOM_KC'::quiz_instances_generation_strategy_enum
          ELSE 'MIXED'::quiz_instances_generation_strategy_enum
        END
      );
  END IF;
END
$$;

-- 10. quiz_instance_questions: link to questions table
ALTER TABLE quiz_instance_questions
  DROP COLUMN IF EXISTS segment_id,
  DROP COLUMN IF EXISTS question_text,
  DROP COLUMN IF EXISTS correct_answer,
  DROP COLUMN IF EXISTS estimate_difficulty,
  ADD COLUMN IF NOT EXISTS question_id uuid REFERENCES questions (id),
  ADD COLUMN IF NOT EXISTS option_order jsonb NULL,
  ADD COLUMN IF NOT EXISTS p_correct_predicted numeric(4,3) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_instance_questions_order
  ON quiz_instance_questions (quiz_instance_id, order_index);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_instance_questions_question
  ON quiz_instance_questions (quiz_instance_id, question_id);

-- 11. quiz_instance_answers: update foreign key on question_id -> questions(id) and add quiz_instance_question_id
DO $$
DECLARE
  fk_name text;
BEGIN
  FOR fk_name IN
    SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_class rt ON rt.oid = c.confrelid
     WHERE t.relname = 'quiz_instance_answers'
       AND c.contype = 'f'
       AND rt.relname = 'quiz_instance_questions'
       AND NOT EXISTS (
         SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'quiz_instance_answers'
            AND column_name = 'quiz_instance_question_id'
       )
  LOOP
    EXECUTE format('ALTER TABLE quiz_instance_answers DROP CONSTRAINT IF EXISTS %I', fk_name);
  END LOOP;
END
$$;

ALTER TABLE quiz_instance_answers
  DROP COLUMN IF EXISTS selected_option,
  ADD COLUMN IF NOT EXISTS quiz_instance_question_id uuid REFERENCES quiz_instance_questions (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS kc_id uuid NULL REFERENCES knowledge_components (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_option_id uuid NULL REFERENCES question_options (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS time_spent_seconds integer NULL,
  ADD COLUMN IF NOT EXISTS answer_text varchar(200) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_class rt ON rt.oid = c.confrelid
     WHERE t.relname = 'quiz_instance_answers'
       AND c.contype = 'f'
       AND rt.relname = 'questions'
  ) THEN
    ALTER TABLE quiz_instance_answers
      ADD CONSTRAINT fk_quiz_instance_answers_question
      FOREIGN KEY (question_id) REFERENCES questions (id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_quiz_instance_answers_student_time
  ON quiz_instance_answers (student_id, answered_at);
