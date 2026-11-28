import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatRelativeTime } from './date';

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

describe('formatDateTime & formatRelativeTime', () => {
  it('formats date and time with seconds', () => {
    expect(formatDateTime('2026-10-18T10:05:09Z')).toMatch(
      /\d{2}\/\d{2}\/2026, \d{2}:05:09/,
    );
    expect(formatDateTime(null)).toBe('—');
  });

  it('formats relative time across seconds, minutes, hours, days, and weeks', () => {
    const now = new Date('2026-11-23T12:00:00Z');
    expect(formatRelativeTime('2026-11-23T11:59:30Z', now)).toBe('Just now');
    expect(formatRelativeTime('2026-11-23T11:55:00Z', now)).toBe('5m ago');
    expect(formatRelativeTime('2026-11-23T10:00:00Z', now)).toBe('2h ago');
    expect(formatRelativeTime('2026-11-20T12:00:00Z', now)).toBe('3d ago');
    expect(formatRelativeTime('2026-11-10T12:00:00Z', now)).toMatch(
      /\d{2}\/\d{2}\/2026/,
    );
  });
});
