-- migrations-manual/003-add-class-lifecycle.sql
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

INSERT INTO subjects (id, subject_code, name, description)
VALUES
  (gen_random_uuid(), 'CS101', 'Nhập môn lập trình', NULL),
  (gen_random_uuid(), 'MATH101', 'Giải tích 1', NULL),
  (gen_random_uuid(), 'ENG101', 'Tiếng Anh 1', NULL),
  (gen_random_uuid(), 'CS102', 'Lập trình hướng đối tượng', NULL),
  (gen_random_uuid(), 'PHYS101', 'Vật lý đại cương', NULL)
ON CONFLICT (subject_code) DO NOTHING;

INSERT INTO semesters (id, semester_code, name, start_date, end_date)
VALUES
  (gen_random_uuid(), 'HK1-2026', 'Học kỳ 1 - 2026',
   '2026-09-01 00:00:00+07', '2026-12-31 23:59:59+07')
ON CONFLICT (semester_code) DO NOTHING;