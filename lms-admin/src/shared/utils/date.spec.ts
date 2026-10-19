import { describe, expect, it } from 'vitest';
import { formatDate } from './date';

describe('formatDate utility', () => {
  it('should format a valid ISO date string correctly', () => {
    const formatted = formatDate('2026-10-18T10:00:00Z');
    expect(formatted).toMatch(/\d{2}\/\d{2}\/2026/);
  });

  it('should format a Date object correctly', () => {
    const formatted = formatDate(new Date('2026-05-15T00:00:00Z'));
    expect(formatted).toMatch(/\d{2}\/\d{2}\/2026/);
  });

  it('should return dash for empty or null inputs', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('should return dash for invalid date strings', () => {
    expect(formatDate('invalid-date')).toBe('—');
  });
});
