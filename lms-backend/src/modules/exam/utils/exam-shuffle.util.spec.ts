import { describe, expect, it } from 'vitest';
import { shuffleWithSeed } from './exam-shuffle.util.js';

describe('exam-shuffle.util', () => {
  const items = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  it('produces the exact same permutation for the same seed without mutating the input', () => {
    const input = [...items];
    const first = shuffleWithSeed(input, 'session-123');
    const second = shuffleWithSeed(input, 'session-123');

    expect(first).toEqual(second);
    expect(input).toEqual(items);
    expect([...first].sort()).toEqual([...items].sort());
  });

  it('produces different permutations for different attempt seeds', () => {
    const attempt1 = shuffleWithSeed(items, 'session-1');
    const attempt2 = shuffleWithSeed(items, 'session-2');

    expect(attempt1).not.toEqual(attempt2);
  });
});
