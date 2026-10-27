import { describe, expect, it } from 'vitest';
import type { ManagedUser } from '../types/users.types';
import {
  getAccountState,
  isCodeForRole,
  getStatusLabel,
  getStatusVariant,
  toHasLoggedIn,
  toIsActive,
} from './user-display';

const createUser = (overrides: Partial<ManagedUser> = {}): ManagedUser => ({
  id: 'u1',
  email: 'gv@school.edu.vn',
  fullName: 'gv',
  avatarUrl: null,
  role: 'LECTURER',
  isActive: true,
  code: 'GV001',
  profileStatus: 'WORKING',
  hasLoggedIn: true,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

describe('getAccountState', () => {
  it('should be pending for an active account nobody has signed in to', () => {
    expect(getAccountState(createUser({ hasLoggedIn: false }))).toBe('pending');
  });

  it('should be active once the person has signed in', () => {
    expect(getAccountState(createUser())).toBe('active');
  });

  it('should be inactive when deactivated, even if never signed in', () => {
    expect(
      getAccountState(createUser({ isActive: false, hasLoggedIn: false })),
    ).toBe('inactive');
  });
});

describe('getStatusLabel / getStatusVariant', () => {
  it('should turn a status code into a readable label', () => {
    expect(getStatusLabel('LECTURER', 'ON_LEAVE')).toBe('On leave');
    expect(getStatusLabel('STUDENT', 'STUDYING')).toBe('Studying');
  });

  it('should fall back to the raw value or a dash', () => {
    expect(getStatusLabel('STUDENT', 'UNKNOWN')).toBe('UNKNOWN');
    expect(getStatusLabel('STUDENT', null)).toBe('—');
  });

  it('should pick a badge colour from the status', () => {
    expect(getStatusVariant('WORKING')).toBe('success');
    expect(getStatusVariant('SUSPENDED')).toBe('destructive');
    expect(getStatusVariant(null)).toBe('default');
  });
});

describe('toIsActive', () => {
  it('should map the account filter to the API flag', () => {
    expect(toIsActive('active')).toBe(true);
    expect(toIsActive('inactive')).toBe(false);
    expect(toIsActive('all')).toBeUndefined();
  });
});

describe('isCodeForRole', () => {
  it('should accept SV codes for students and GV codes for lecturers', () => {
    expect(isCodeForRole('SV26000001', 'STUDENT')).toBe(true);
    expect(isCodeForRole('GV26000001', 'LECTURER')).toBe(true);
  });

  it('should reject a code of the other role', () => {
    expect(isCodeForRole('GV26000001', 'STUDENT')).toBe(false);
    expect(isCodeForRole('SV26000001', 'LECTURER')).toBe(false);
  });
});

describe('account filters', () => {
  it('should map each filter to the badge it stands for', () => {
    expect(toIsActive('all')).toBeUndefined();
    expect(toHasLoggedIn('all')).toBeUndefined();

    expect(toIsActive('active')).toBe(true);
    expect(toHasLoggedIn('active')).toBe(true);

    expect(toIsActive('pending')).toBe(true);
    expect(toHasLoggedIn('pending')).toBe(false);

    expect(toIsActive('inactive')).toBe(false);
    expect(toHasLoggedIn('inactive')).toBeUndefined();
  });
});
