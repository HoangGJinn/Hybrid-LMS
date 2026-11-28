export type FieldChange = {
  readonly from: unknown;
  readonly to: unknown;
};

export type FieldChanges = Record<string, FieldChange>;

const normalizeValue = (value: unknown): unknown => {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
};

const isEqualValue = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * Compares selected fields between `before` and `after`, returning only changed fields.
 * Uses an explicit `allowList` so sensitive columns (passwordHash, tokens) can never leak.
 */
export const diffFields = <T extends Record<string, unknown>>(
  before: T,
  after: T,
  allowList: readonly (keyof T)[],
): FieldChanges | null => {
  const changes: FieldChanges = {};
  for (const key of allowList) {
    const from = normalizeValue(before[key]);
    const to = normalizeValue(after[key]);
    if (!isEqualValue(from, to)) {
      changes[String(key)] = { from, to };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
};
