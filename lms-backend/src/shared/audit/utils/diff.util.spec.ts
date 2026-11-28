import { describe, expect, it } from 'vitest';
import { diffFields } from './diff.util.js';

describe('diffFields', () => {
  it('returns null when no allow-listed fields changed', () => {
    const before = { fullName: 'A', email: 'a@school.edu.vn', passwordHash: 'old' };
    const after = { fullName: 'A', email: 'a@school.edu.vn', passwordHash: 'new' };

    expect(diffFields(before, after, ['fullName', 'email'])).toBeNull();
  });

  it('returns only changed fields from allowList and ignores unlisted fields', () => {
    const before = {
      fullName: 'Nguyen A',
      email: 'a@school.edu.vn',
      passwordHash: 'secret-1',
    };
    const after = {
      fullName: 'Nguyen B',
      email: 'a@school.edu.vn',
      passwordHash: 'secret-2',
    };

    expect(diffFields(before, after, ['fullName', 'email'])).toEqual({
      fullName: { from: 'Nguyen A', to: 'Nguyen B' },
    });
  });

  it('normalizes Date objects to ISO strings and undefined to null', () => {
    const d1 = new Date('2026-01-01T00:00:00.000Z');
    const d2 = new Date('2026-02-01T00:00:00.000Z');
    const before = { startDate: d1, note: undefined as string | undefined };
    const after = { startDate: d2, note: null as string | null };

    expect(diffFields(before, after, ['startDate', 'note'])).toEqual({
      startDate: { from: '2026-01-01T00:00:00.000Z', to: '2026-02-01T00:00:00.000Z' },
    });
  });
});
