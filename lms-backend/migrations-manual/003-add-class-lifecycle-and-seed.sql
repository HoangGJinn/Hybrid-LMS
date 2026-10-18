-- migrations-manual/003-add-class-lifecycle.sql
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

INSERT INTO subjects (id, subject_code, name, description)
VALUES
  (gen_random_uuid(), 'CS101', 'Nhập môn lập trình', 'Môn học cơ sở lập trình'),
  (gen_random_uuid(), 'MATH101', 'Giải tích 1', 'Giải tích toán học'),
  (gen_random_uuid(), 'ENG101', 'Tiếng Anh 1', 'Tiếng Anh cơ bản'),
  (gen_random_uuid(), 'CS102', 'Lập trình hướng đối tượng', 'OOP căn bản và nâng cao'),
  (gen_random_uuid(), 'PHYS101', 'Vật lý đại cương', 'Vật lý đại cương')
ON CONFLICT (subject_code) DO NOTHING;

INSERT INTO semesters (id, semester_code, name, start_date, end_date)
VALUES
  (gen_random_uuid(), 'HK1-2026', 'Học kỳ 1 - 2026',
   '2026-09-01 00:00:00+07', '2026-12-31 23:59:59+07'),
  (gen_random_uuid(), 'HK2-2026', 'Học kỳ 2 - 2026',
   '2027-01-15 00:00:00+07', '2027-05-31 23:59:59+07')
ON CONFLICT (semester_code) DO NOTHING;

-- Sample lecturers for class assignment
INSERT INTO users (id, email, full_name, sso_id, sso_provider, role, is_active)
VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'lecturer.an@hcmute.edu.vn', 'TS. Nguyễn Văn An', 'sso_lecturer_an', 'GOOGLE', 'LECTURER', true),
  ('b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e', 'lecturer.binh@hcmute.edu.vn', 'ThS. Trần Thị Bình', 'sso_lecturer_binh', 'GOOGLE', 'LECTURER', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO lecturers (user_id, lecturer_code, status)
VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'GV001', 'WORKING'),
  ('b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e', 'GV002', 'WORKING')
ON CONFLICT (user_id) DO NOTHING;