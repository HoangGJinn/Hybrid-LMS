import { describe, expect, it } from 'vitest';
import {
  formatHourRange,
  niceMax,
  quietestWindow,
  shortDate,
} from './chart';

describe('dashboard chart utilities', () => {
  it('returns even Y-axis ceilings so midpoints are exact integers', () => {
    for (const sample of [1, 2, 3, 5, 7, 9, 11, 15, 23, 47, 99, 130]) {
      const ceiling = niceMax(sample);
      expect(ceiling).toBeGreaterThanOrEqual(sample);
      expect(ceiling % 2).toBe(0);
    }
  });

  it('formats ISO YYYY-MM-DD dates as DD/MM', () => {
    expect(shortDate('2026-11-05')).toBe('05/11');
    expect(shortDate('invalid')).toBe('invalid');
  });

  it('formats 24h ranges wrapping across midnight', () => {
    expect(formatHourRange(9)).toBe('09:00–10:00');
    expect(formatHourRange(23)).toBe('23:00–00:00');
    expect(formatHourRange(22, 3)).toBe('22:00–01:00');
  });

  it('finds quietest 3-hour window including overnight wrap-around', () => {
    const busyAllExceptNight = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hour === 22 || hour === 23 || hour === 0 ? 0 : 10,
    }));
    expect(quietestWindow(busyAllExceptNight)).toBe(22);
    expect(quietestWindow([])).toBe(0);
  });
});
