import { QueryFailedError } from 'typeorm';

export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';

export const driverErrorOf = (error: unknown): object | null => {
  if (!(error instanceof QueryFailedError)) return null;
  const driverError: unknown = error.driverError;
  return typeof driverError === 'object' && driverError !== null
    ? driverError
    : null;
};

export const hasDriverCode = (error: unknown, code: string): boolean => {
  const driverError = driverErrorOf(error);
  return (
    driverError !== null && 'code' in driverError && driverError.code === code
  );
};

/** True when a database error is a unique / primary-key violation (e.g. the same row inserted twice). */
export const isUniqueViolation = (error: unknown): boolean =>
  hasDriverCode(error, PG_UNIQUE_VIOLATION);

/** True when a database error is a foreign-key violation (a row is still referenced by another table). */
export const isForeignKeyViolation = (error: unknown): boolean =>
  hasDriverCode(error, PG_FOREIGN_KEY_VIOLATION);

/** Which form field a unique violation is about; null when the driver does not say. */
export const uniqueViolationField = (error: unknown): 'email' | 'code' | null => {
  if (!isUniqueViolation(error)) return null;
  const driverError = driverErrorOf(error);
  // Postgres: `Key (email)=(a@b.c) already exists.`
  const detail =
    driverError !== null &&
    'detail' in driverError &&
    typeof driverError.detail === 'string'
      ? driverError.detail
      : '';
  if (detail.includes('(email)')) return 'email';
  if (detail.includes('(student_code)') || detail.includes('(lecturer_code)'))
    return 'code';
  return null;
};
