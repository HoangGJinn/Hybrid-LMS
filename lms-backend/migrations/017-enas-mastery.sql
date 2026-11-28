-- Chuyển 4 bảng mastery từ BKT sang ENAS-KT.
-- Môi trường local dùng synchronize nên không cần chạy; chạy tay trên môi trường khác.
-- Idempotent: chạy lại nhiều lần vẫn an toàn.

BEGIN;

-- 1) student_kc_mastery: bỏ tham số BKT (ENAS không có), thêm thông tin truy vết dự đoán.
ALTER TABLE student_kc_mastery
  DROP COLUMN IF EXISTS p_learn,
  DROP COLUMN IF EXISTS p_guess,
  DROP COLUMN IF EXISTS p_slip;

ALTER TABLE student_kc_mastery
  ADD COLUMN IF NOT EXISTS p_prev        numeric(4,3),
  ADD COLUMN IF NOT EXISTS sample_size   integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correct_count integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source        varchar(10) NOT NULL DEFAULT 'enas',
  ADD COLUMN IF NOT EXISTS enas_log_seq  integer,
  ADD COLUMN IF NOT EXISTS lag_mode      varchar(10);

-- Mỗi sinh viên chỉ có một dòng cho mỗi KC (giữ dòng mới nhất nếu lỡ có trùng).
DELETE FROM student_kc_mastery a
USING student_kc_mastery b
WHERE a.student_id = b.student_id AND a.kc_id = b.kc_id
  AND (a.last_updated, a.id) < (b.last_updated, b.id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_kc_mastery_student_kc
  ON student_kc_mastery (student_id, kc_id);

-- 2) student_subject_competency: một dòng cho mỗi (sinh viên, môn).
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_subject_competency_student_subject
  ON student_subject_competency (student_id, subject_id);

-- 3) student_competency_history: quiz đầu tiên của môn chưa có "trước"; mỗi quiz ghi một lần.
ALTER TABLE student_competency_history ALTER COLUMN ability_score_before DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_competency_history_quiz
  ON student_competency_history (quiz_instance_id, subject_competency_id);

-- 4) Bảng mới: mastery của từng KC trước/sau mỗi quiz.
CREATE TABLE IF NOT EXISTS student_kc_mastery_history (
  id               uuid         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id       uuid         NOT NULL,
  kc_id            uuid         NOT NULL,
  quiz_instance_id uuid         NOT NULL,
  p_before         numeric(4,3),
  p_after          numeric(4,3) NOT NULL,
  sample_size      integer      NOT NULL DEFAULT 0,
  source           varchar(10)  NOT NULL DEFAULT 'enas',
  enas_log_seq     integer,
  recorded_at      timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT "FK_c76db8628f66adfcadff15b6d30" FOREIGN KEY (student_id)
    REFERENCES students (user_id) ON DELETE CASCADE,
  CONSTRAINT "FK_efe036f735a736165af71cb717d" FOREIGN KEY (kc_id)
    REFERENCES knowledge_components (id) ON DELETE CASCADE,
  CONSTRAINT "FK_6c09c75e78211e6803b0c30895c" FOREIGN KEY (quiz_instance_id)
    REFERENCES quiz_instances (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_kc_mastery_history_quiz_kc
  ON student_kc_mastery_history (quiz_instance_id, kc_id);
CREATE INDEX IF NOT EXISTS idx_student_kc_mastery_history_student_kc
  ON student_kc_mastery_history (student_id, kc_id, recorded_at);

COMMIT;
