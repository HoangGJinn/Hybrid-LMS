-- ============================================================
-- 002-seed.sql
-- Sample data for development / demo.
-- Run AFTER 001-initial-schema.sql on a fresh database.
-- ============================================================

-- ── Subjects ─────────────────────────────────────────────────
INSERT INTO subjects (id, subject_code, name, description)
VALUES
  (gen_random_uuid(), 'CS101',   'Nhập môn lập trình',          'Môn học cơ sở lập trình'),
  (gen_random_uuid(), 'MATH101', 'Giải tích 1',                 'Giải tích toán học'),
  (gen_random_uuid(), 'ENG101',  'Tiếng Anh 1',                 'Tiếng Anh cơ bản'),
  (gen_random_uuid(), 'CS102',   'Lập trình hướng đối tượng',   'OOP căn bản và nâng cao'),
  (gen_random_uuid(), 'PHYS101', 'Vật lý đại cương',            'Vật lý đại cương')
ON CONFLICT (subject_code) DO NOTHING;

-- ── Semesters ────────────────────────────────────────────────
INSERT INTO semesters (id, semester_code, name, start_date, end_date)
VALUES
  (gen_random_uuid(), 'HK1-2026', 'Học kỳ 1 - 2026',
   '2026-09-01 00:00:00+07', '2026-12-31 23:59:59+07'),
  (gen_random_uuid(), 'HK2-2026', 'Học kỳ 2 - 2026',
   '2027-01-15 00:00:00+07', '2027-05-31 23:59:59+07')
ON CONFLICT (semester_code) DO NOTHING;

-- ── Sample lecturers ─────────────────────────────────────────
-- Codes: GV + YY(26) + 6-digit sequential (GV26000001, GV26000002)
INSERT INTO users (id, email, full_name, sso_id, sso_provider, role, is_active)
VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
   'lecturer.an@hcmute.edu.vn', 'TS. Nguyễn Văn An',
   'sso_lecturer_an', 'GOOGLE', 'LECTURER', true),
  ('b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e',
   'lecturer.binh@hcmute.edu.vn', 'ThS. Trần Thị Bình',
   'sso_lecturer_binh', 'GOOGLE', 'LECTURER', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO lecturers (user_id, lecturer_code, status)
VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'GV26000001', 'WORKING'),
  ('b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e', 'GV26000002', 'WORKING')
ON CONFLICT (user_id) DO NOTHING;

-- Advance the lecturer sequence past the manually-seeded codes so the next
-- auto-generated lecturer code starts at GV26000003.
SELECT setval('lecturer_code_seq', 2, true);

-- ── Sample students ──────────────────────────────────────────
-- Codes: SV + YY(26) + 6-digit sequential (SV26000001, SV26000002, SV26000003)
INSERT INTO users (id, email, full_name, sso_id, sso_provider, role, is_active)
VALUES
  ('01e8172e-a0a6-4fe1-9ecb-6faf10ea0aa7',
   'nguyenhoanggiap2005@gmail.com', 'Nguyễn Hoàng Giáp',
   NULL, NULL, 'STUDENT', true),
  ('c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
   'thanhtratik@gmail.com', 'Thanh Trà',
   'sso_thanhtratik', 'GOOGLE', 'STUDENT', true),
  ('d4e5f6a7-b8c9-4d0e-9f2a-3b4c5d6e7f8a',
   'ngochuynh150905@gmail.com', 'Ngọc Huỳnh',
   'sso_ngochuynh', 'GOOGLE', 'STUDENT', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO students (user_id, student_code, status)
VALUES
  ((SELECT id FROM users WHERE email = 'nguyenhoanggiap2005@gmail.com'), 'SV26000001', 'STUDYING'),
  ((SELECT id FROM users WHERE email = 'thanhtratik@gmail.com'),          'SV26000002', 'STUDYING'),
  ((SELECT id FROM users WHERE email = 'ngochuynh150905@gmail.com'),       'SV26000003', 'STUDYING')
ON CONFLICT (user_id) DO NOTHING;

-- Advance the student sequence past the manually-seeded codes so the next
-- auto-generated student code starts at SV26000004.
SELECT setval('student_code_seq', 3, true);

-- ── Classes ──────────────────────────────────────────────────
INSERT INTO classes (id, class_code, name, subject_id, semester_id, lecturer_id, is_active)
VALUES (
  '415cb5b1-216d-4c5e-8a78-2a3f043ab638',
  'WEB26',
  'Lập trình Web - Nhóm 26',
  (SELECT id FROM subjects WHERE subject_code = 'CS102'),
  (SELECT id FROM semesters WHERE semester_code = 'HK1-2026'),
  (SELECT id FROM users WHERE email = 'lecturer.an@hcmute.edu.vn'),
  true
)
ON CONFLICT (class_code) DO NOTHING;

-- ── Enroll students into WEB26 ───────────────────────────────
INSERT INTO class_students (class_id, student_id, joined_at)
SELECT
  '415cb5b1-216d-4c5e-8a78-2a3f043ab638',
  u.id,
  NOW()
FROM users u
WHERE u.email IN (
  'nguyenhoanggiap2005@gmail.com',
  'thanhtratik@gmail.com',
  'ngochuynh150905@gmail.com'
)
ON CONFLICT (class_id, student_id) DO NOTHING;
