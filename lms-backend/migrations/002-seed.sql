-- ============================================================
-- 002-seed.sql
-- Sample data for development / demo / testing.
-- Run AFTER 001-sequences.sql and 004-add-password-hash.sql.
-- Password for all 16 accounts: admine123456
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

-- ── 1. Admin Account ───────────────────────────────────────────
-- Password: admine123456 ($2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e)
INSERT INTO users (id, email, full_name, password_hash, role, is_active)
VALUES
  ('00000000-0000-4000-a000-000000000001',
   'admin@lms.edu.vn', 'Quản trị viên Hệ thống',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'ADMIN', true)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- ── 2. 5 Lecturer Accounts ─────────────────────────────────────
-- Codes: GV26000001 to GV26000005
INSERT INTO users (id, email, full_name, password_hash, role, is_active)
VALUES
  ('10000000-0000-4000-a000-000000000001',
   'teacher1@lms.edu.vn', 'TS. Nguyễn Văn An',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'LECTURER', true),
  ('10000000-0000-4000-a000-000000000002',
   'teacher2@lms.edu.vn', 'ThS. Trần Thị Bình',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'LECTURER', true),
  ('10000000-0000-4000-a000-000000000003',
   'teacher3@lms.edu.vn', 'TS. Lê Hoàng Cường',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'LECTURER', true),
  ('10000000-0000-4000-a000-000000000004',
   'teacher4@lms.edu.vn', 'ThS. Phạm Thu Dung',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'LECTURER', true),
  ('10000000-0000-4000-a000-000000000005',
   'teacher5@lms.edu.vn', 'TS. Hoàng Gia Em',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'LECTURER', true)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO lecturers (user_id, lecturer_code, status)
VALUES
  ('10000000-0000-4000-a000-000000000001', 'GV26000001', 'WORKING'),
  ('10000000-0000-4000-a000-000000000002', 'GV26000002', 'WORKING'),
  ('10000000-0000-4000-a000-000000000003', 'GV26000003', 'WORKING'),
  ('10000000-0000-4000-a000-000000000004', 'GV26000004', 'WORKING'),
  ('10000000-0000-4000-a000-000000000005', 'GV26000005', 'WORKING')
ON CONFLICT (user_id) DO NOTHING;

SELECT setval('lecturer_code_seq', 5, true);

-- ── 3. 10 Student Accounts ─────────────────────────────────────
-- Codes: SV26000001 to SV26000010
INSERT INTO users (id, email, full_name, password_hash, role, is_active)
VALUES
  ('20000000-0000-4000-a000-000000000001',
   'student1@lms.edu.vn', 'Nguyễn Văn Nam',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'STUDENT', true),
  ('20000000-0000-4000-a000-000000000002',
   'student2@lms.edu.vn', 'Phạm Quỳnh Anh',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'STUDENT', true),
  ('20000000-0000-4000-a000-000000000003',
   'student3@lms.edu.vn', 'Huỳnh Ngọc Mai',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'STUDENT', true),
  ('20000000-0000-4000-a000-000000000004',
   'student4@lms.edu.vn', 'Lê Quốc Bảo',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'STUDENT', true),
  ('20000000-0000-4000-a000-000000000005',
   'student5@lms.edu.vn', 'Phạm Minh Duy',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'STUDENT', true),
  ('20000000-0000-4000-a000-000000000006',
   'student6@lms.edu.vn', 'Võ Hoàng Yến',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'STUDENT', true),
  ('20000000-0000-4000-a000-000000000007',
   'student7@lms.edu.vn', 'Đặng Thùy Dung',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'STUDENT', true),
  ('20000000-0000-4000-a000-000000000008',
   'student8@lms.edu.vn', 'Bùi Anh Tuấn',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'STUDENT', true),
  ('20000000-0000-4000-a000-000000000009',
   'student9@lms.edu.vn', 'Đỗ Hữu Thắng',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'STUDENT', true),
  ('20000000-0000-4000-a000-000000000010',
   'student10@lms.edu.vn', 'Ngô Trọng Nghĩa',
   '$2b$10$0efWZrLo4lZBp7tCszn/uO6qAY7r4MX8XsWK3We8JG9gYKGqbbW0e', 'STUDENT', true)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO students (user_id, student_code, status)
VALUES
  ('20000000-0000-4000-a000-000000000001', 'SV26000001', 'STUDYING'),
  ('20000000-0000-4000-a000-000000000002', 'SV26000002', 'STUDYING'),
  ('20000000-0000-4000-a000-000000000003', 'SV26000003', 'STUDYING'),
  ('20000000-0000-4000-a000-000000000004', 'SV26000004', 'STUDYING'),
  ('20000000-0000-4000-a000-000000000005', 'SV26000005', 'STUDYING'),
  ('20000000-0000-4000-a000-000000000006', 'SV26000006', 'STUDYING'),
  ('20000000-0000-4000-a000-000000000007', 'SV26000007', 'STUDYING'),
  ('20000000-0000-4000-a000-000000000008', 'SV26000008', 'STUDYING'),
  ('20000000-0000-4000-a000-000000000009', 'SV26000009', 'STUDYING'),
  ('20000000-0000-4000-a000-000000000010', 'SV26000010', 'STUDYING')
ON CONFLICT (user_id) DO NOTHING;

SELECT setval('student_code_seq', 10, true);

-- ── 4. Sample Class WEB26 ──────────────────────────────────────
INSERT INTO classes (id, class_code, name, subject_id, semester_id, lecturer_id, is_active)
VALUES (
  '415cb5b1-216d-4c5e-8a78-2a3f043ab638',
  'WEB26',
  'Lập trình Web - Nhóm 26',
  (SELECT id FROM subjects WHERE subject_code = 'CS102'),
  (SELECT id FROM semesters WHERE semester_code = 'HK1-2026'),
  '10000000-0000-4000-a000-000000000001', -- TS. Nguyễn Văn An (teacher1)
  true
)
ON CONFLICT (class_code) DO NOTHING;

-- ── 5. Enroll all 10 students into WEB26 ────────────────────────
INSERT INTO class_students (class_id, student_id, joined_at)
SELECT
  '415cb5b1-216d-4c5e-8a78-2a3f043ab638',
  u.id,
  NOW()
FROM users u
WHERE u.email LIKE 'student%@lms.edu.vn'
ON CONFLICT (class_id, student_id) DO NOTHING;
