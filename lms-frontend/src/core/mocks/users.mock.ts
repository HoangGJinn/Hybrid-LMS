import type { AuthUser } from '@core/types/auth.types';

const now = new Date().toISOString();

export const mockStudent: AuthUser = {
  id: 'stu-001',
  email: 'student@university.edu',
  fullName: 'Nguyen Van A',
  avatarUrl: null,
  code: 'SE000001',
  role: 'STUDENT',
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

export const mockLecturer: AuthUser = {
  id: 'lec-001',
  email: 'lecturer@university.edu',
  fullName: 'Dr. Tran Van B',
  avatarUrl: null,
  code: 'LC000001',
  role: 'LECTURER',
  isActive: true,
  createdAt: now,
  updatedAt: now,
};
