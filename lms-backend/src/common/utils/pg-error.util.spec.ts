import { describe, expect, it } from 'vitest';
import { QueryFailedError } from 'typeorm';
import {
  isForeignKeyViolation,
  isUniqueViolation,
  uniqueViolationField,
} from './pg-error.util.js';

describe('pg-error.util', () => {
  const queryError = (driverError: object) =>
    new QueryFailedError('SQL', [], Object.assign(new Error('x'), driverError));

  describe('isUniqueViolation', () => {
    it('returns true for PostgreSQL unique violation code 23505', () => {
      const error = queryError({ code: '23505' });
      expect(isUniqueViolation(error)).toBe(true);
    });

    it('returns false for other codes or non-QueryFailedError', () => {
      expect(isUniqueViolation(queryError({ code: '23503' }))).toBe(false);
      expect(isUniqueViolation(new Error('boom'))).toBe(false);
      expect(isUniqueViolation(null)).toBe(false);
    });
  });

  describe('isForeignKeyViolation', () => {
    it('returns true for PostgreSQL foreign key violation code 23503', () => {
      expect(isForeignKeyViolation(queryError({ code: '23503' }))).toBe(true);
    });

    it('returns false for other codes or non-QueryFailedError', () => {
      expect(isForeignKeyViolation(queryError({ code: '23505' }))).toBe(false);
      expect(isForeignKeyViolation(new Error('boom'))).toBe(false);
    });
  });

  describe('uniqueViolationField', () => {
    it('identifies email field violation', () => {
      const error = queryError({
        code: '23505',
        detail: 'Key (email)=(user@example.com) already exists.',
      });
      expect(uniqueViolationField(error)).toBe('email');
    });

    it('identifies student_code and lecturer_code field violations', () => {
      const studentError = queryError({
        code: '23505',
        detail: 'Key (student_code)=(SV26000001) already exists.',
      });
      expect(uniqueViolationField(studentError)).toBe('code');

      const lecturerError = queryError({
        code: '23505',
        detail: 'Key (lecturer_code)=(GV26000001) already exists.',
      });
      expect(uniqueViolationField(lecturerError)).toBe('code');
    });

    it('returns null for unknown field details or non-unique violations', () => {
      expect(uniqueViolationField(queryError({ code: '23505' }))).toBeNull();
      expect(
        uniqueViolationField(
          queryError({ code: '23503', detail: 'Key (email)=(x)' }),
        ),
      ).toBeNull();
      expect(uniqueViolationField(new Error('boom'))).toBeNull();
    });
  });
});
