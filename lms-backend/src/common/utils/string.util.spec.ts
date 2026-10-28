import { describe, it, expect } from 'vitest';
import { emptyToNull, emptyToUndefined } from './string.util.js';

describe('string.util', () => {
  describe('emptyToNull', () => {
    it('returns null for undefined', () => {
      expect(emptyToNull(undefined)).toBeNull();
    });

    it('returns null for null', () => {
      expect(emptyToNull(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(emptyToNull('')).toBeNull();
    });

    it('returns null for blank string with whitespace only', () => {
      expect(emptyToNull('   ')).toBeNull();
      expect(emptyToNull('\t\n ')).toBeNull();
    });

    it('returns trimmed string for non-empty string', () => {
      expect(emptyToNull('hello')).toBe('hello');
      expect(emptyToNull('  hello world  ')).toBe('hello world');
    });
  });

  describe('emptyToUndefined', () => {
    it('returns undefined for undefined', () => {
      expect(emptyToUndefined(undefined)).toBeUndefined();
    });

    it('returns undefined for null', () => {
      expect(emptyToUndefined(null)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(emptyToUndefined('')).toBeUndefined();
    });

    it('returns undefined for blank string with whitespace only', () => {
      expect(emptyToUndefined('   ')).toBeUndefined();
      expect(emptyToUndefined('\t\n ')).toBeUndefined();
    });

    it('returns trimmed string for non-empty string', () => {
      expect(emptyToUndefined('hello')).toBe('hello');
      expect(emptyToUndefined('  hello world  ')).toBe('hello world');
    });
  });
});

