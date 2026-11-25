import { describe, expect, it } from 'vitest';
import {
  endOfVnDay,
  formatVnDate,
  parseCalendarDate,
  startOfVnDay,
} from './vn-date.util.js';

describe('vn-date util', () => {
  describe('parseCalendarDate', () => {
    it('reads dd/MM/yyyy, d/M/yyyy and yyyy-MM-dd', () => {
      const expected = { year: 2026, month: 9, day: 5 };
      expect(parseCalendarDate('05/09/2026')).toEqual(expected);
      expect(parseCalendarDate('5/9/2026')).toEqual(expected);
      expect(parseCalendarDate('2026-09-05')).toEqual(expected);
      expect(parseCalendarDate(' 2026-09-05T00:00:00.000Z ')).toEqual(expected);
    });

    it('rejects text that is not a real calendar date', () => {
      expect(parseCalendarDate('31/02/2026')).toBeNull();
      expect(parseCalendarDate('2026-13-01')).toBeNull();
      expect(parseCalendarDate('09/05/26')).toBeNull();
      expect(parseCalendarDate('soon')).toBeNull();
      expect(parseCalendarDate('')).toBeNull();
    });

    it('accepts 29 February only in a leap year', () => {
      expect(parseCalendarDate('29/02/2028')).not.toBeNull();
      expect(parseCalendarDate('29/02/2027')).toBeNull();
    });
  });

  describe('Vietnam day boundaries', () => {
    const day = { year: 2026, month: 9, day: 5 };

    it('starts a day at 00:00 Vietnam time, which is 17:00 UTC the day before', () => {
      expect(startOfVnDay(day).toISOString()).toBe('2026-09-04T17:00:00.000Z');
    });

    it('ends a day at 23:59:59.999 Vietnam time', () => {
      expect(endOfVnDay(day).toISOString()).toBe('2026-09-05T16:59:59.999Z');
    });
  });

  describe('formatVnDate', () => {
    it('shows the day as seen in Vietnam, not in UTC', () => {
      // 20:00 UTC on 4 Sep is already 5 Sep in Vietnam.
      expect(formatVnDate(new Date('2026-09-04T20:00:00Z'))).toBe('05/09/2026');
      expect(formatVnDate(new Date('2026-09-04T16:59:00Z'))).toBe('04/09/2026');
    });

    it('is empty without a date', () => {
      expect(formatVnDate(null)).toBe('');
      expect(formatVnDate(undefined)).toBe('');
    });

    it('round-trips with the day boundaries', () => {
      const day = { year: 2026, month: 12, day: 31 };
      expect(formatVnDate(startOfVnDay(day))).toBe('31/12/2026');
      expect(formatVnDate(endOfVnDay(day))).toBe('31/12/2026');
    });
  });
});
