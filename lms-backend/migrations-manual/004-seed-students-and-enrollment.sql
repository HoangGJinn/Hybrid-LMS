-- migrations-manual/004-seed-students-and-enrollment.sql

-- 1. Insert new students into users table (if not exists)
INSERT INTO users (id, email, full_name, sso_id, sso_provider, role, is_active)
VALUES
  ('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'thanhtratik@gmail.com', 'Thanh Trà', 'sso_thanhtratik', 'GOOGLE', 'STUDENT', true),
  ('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', 'ngochuynh150905@gmail.com', 'Ngọc Huỳnh', 'sso_ngochuynh', 'GOOGLE', 'STUDENT', true)
ON CONFLICT (email) DO UPDATE SET
  role = 'STUDENT',
  is_active = true;

-- 2. Insert student profile into students table
INSERT INTO students (user_id, student_code, status)
VALUES
  ((SELECT id FROM users WHERE email = 'nguyenhoanggiap2005@gmail.com'), 'SV2005001', 'STUDYING'),
  ((SELECT id FROM users WHERE email = 'thanhtratik@gmail.com'), 'SV2005002', 'STUDYING'),
  ((SELECT id FROM users WHERE email = 'ngochuynh150905@gmail.com'), 'SV2005003', 'STUDYING')
ON CONFLICT (user_id) DO NOTHING;

-- 3. Enroll students into active class 'WEB26' (415cb5b1-216d-4c5e-8a78-2a3f043ab638)
INSERT INTO class_students (class_id, student_id, joined_at)
SELECT 
  '415cb5b1-216d-4c5e-8a78-2a3f043ab638',
  u.id,
  NOW()
FROM users u
WHERE u.email IN ('nguyenhoanggiap2005@gmail.com', 'thanhtratik@gmail.com', 'ngochuynh150905@gmail.com')
ON CONFLICT (class_id, student_id) DO NOTHING;
