import { describe, expect, it } from 'vitest';
import { escapeLike } from './sql.util.js';

describe('sql.util', () => {
  describe('escapeLike', () => {
    it('escapes %, _, and \\ characters', () => {
      expect(escapeLike('50%_off\\deal')).toBe('50\\%\\_off\\\\deal');
    });

    it('leaves normal text untouched', () => {
      expect(escapeLike('John Doe 123')).toBe('John Doe 123');
    });

    it('handles empty string', () => {
      expect(escapeLike('')).toBe('');
    });
  });
});
