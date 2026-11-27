import { describe, expect, it } from 'vitest';
import { masteryConfidence, masteryLevel, questionFit } from './mastery.js';

describe('masteryLevel', () => {
  it('is NEW when the student never answered, whatever the model says', () => {
    expect(masteryLevel(0.9, 0)).toBe('NEW');
    expect(masteryLevel(null, 5)).toBe('NEW');
  });

  it.each([
    [0.8, 'MASTERED'],
    [0.79, 'GOOD'],
    [0.6, 'GOOD'],
    [0.59, 'UNSURE'],
    [0.4, 'UNSURE'],
    [0.39, 'WEAK'],
  ])('maps %f to %s', (mastery, level) => {
    expect(masteryLevel(mastery, 4)).toBe(level);
  });
});

describe('masteryConfidence', () => {
  it.each([
    [0, 'LOW'],
    [2, 'LOW'],
    [3, 'MEDIUM'],
    [5, 'MEDIUM'],
    [6, 'HIGH'],
  ])('maps %i answers to %s', (n, c) => {
    expect(masteryConfidence(n)).toBe(c);
  });
});

describe('questionFit', () => {
  it('is null without a prediction', () => {
    expect(questionFit(null)).toBeNull();
  });
  it.each([
    [0.9, 'EASY'],
    [0.75, 'EASY'],
    [0.6, 'FIT'],
    [0.45, 'FIT'],
    [0.44, 'CHALLENGE'],
  ])('maps P=%f to %s', (p, fit) => {
    expect(questionFit(p)).toBe(fit);
  });
});
