import { describe, expect, it } from 'vitest';
import { abilityScore, addDays, nextReviewState, roundMastery } from './mastery-tracking.js';

describe('abilityScore', () => {
  it('is 100 x the mean mastery, 0 without KCs', () => {
    expect(abilityScore([])).toBe(0);
    expect(abilityScore([0.5, 0.75, 1])).toBe(75);
    expect(abilityScore([0.333, 0.334])).toBe(33.35);
  });
});

describe('roundMastery', () => {
  it('keeps 3 decimals', () => {
    expect(roundMastery(0.51234)).toBe(0.512);
    expect(roundMastery(1)).toBe(1);
  });
});

describe('nextReviewState', () => {
  it('uses short fixed intervals while mastery is low', () => {
    expect(nextReviewState(0.3, true, null).intervalDays).toBe(1);
    expect(nextReviewState(0.5, true, null).intervalDays).toBe(3);
    expect(nextReviewState(0.7, true, null).intervalDays).toBe(7);
  });

  it('starts strong KCs at 14 days with the initial ease', () => {
    expect(nextReviewState(0.9, true, null)).toEqual({ intervalDays: 14, easeFactor: 2.5 });
  });

  it('grows the interval of strong KCs by the ease factor, capped at 60 days', () => {
    expect(nextReviewState(0.9, true, { intervalDays: 14, easeFactor: 2.0 })).toEqual({
      intervalDays: 29,
      easeFactor: 2.1,
    });
    expect(nextReviewState(0.9, true, { intervalDays: 50, easeFactor: 2.5 }).intervalDays).toBe(60);
  });

  it('lowers the ease factor when mastery dropped, never below 1.3', () => {
    expect(nextReviewState(0.5, false, { intervalDays: 7, easeFactor: 2.5 }).easeFactor).toBe(2.3);
    expect(nextReviewState(0.5, false, { intervalDays: 7, easeFactor: 1.4 }).easeFactor).toBe(1.3);
  });

  it('never lets a strong KC come back sooner than 7 days', () => {
    expect(nextReviewState(0.85, false, { intervalDays: 1, easeFactor: 1.3 }).intervalDays).toBe(7);
  });
});

describe('addDays', () => {
  it('adds whole days', () => {
    expect(addDays(new Date('2026-01-01T00:00:00Z'), 3).toISOString()).toBe('2026-01-04T00:00:00.000Z');
  });
});
