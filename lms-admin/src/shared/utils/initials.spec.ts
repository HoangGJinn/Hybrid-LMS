import { describe, expect, it } from 'vitest';
import { initials } from './initials';

describe('initials utility', () => {
  it('should extract last two initials from a multi-word name', () => {
    expect(initials('Nguyen Van A')).toBe('VA');
    expect(initials('John Doe')).toBe('JD');
  });

  it('should extract single initial from a single-word name', () => {
    expect(initials('Admin')).toBe('A');
  });

  it('should fall back to default when name is null or undefined', () => {
    expect(initials(null)).toBe('A');
    expect(initials(undefined)).toBe('A');
  });
});
