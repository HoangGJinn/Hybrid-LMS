import { randomInt } from 'node:crypto';

/** Uniform random integer in [0, max). */
export const randomIndex = (max: number): number => randomInt(0, max);

/** Uniform random float in [0, 1). */
export const randomUnit = (): number => randomInt(0, 1_000_000) / 1_000_000;

/** Fisher-Yates shuffle; returns a new array. */
export const shuffled = <T>(items: readonly T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};