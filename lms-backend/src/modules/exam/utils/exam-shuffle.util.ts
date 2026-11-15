const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

/** Deterministic 32-bit FNV-1a hash of a string seed. */
const hashSeed = (seed: string): number => {
  let hash = FNV_OFFSET;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
};

/** Mulberry32 deterministic PRNG returning floats in [0, 1). */
const createPrng = (initialState: number): (() => number) => {
  let state = initialState >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Returns a deterministically shuffled copy of `items` for the given `seed`.
 * Reloading the same attempt always yields the exact same order; a new attempt id yields a new permutation.
 */
export const shuffleWithSeed = <T>(items: readonly T[], seed: string): T[] => {
  const copy = [...items];
  const nextRandom = createPrng(hashSeed(seed));
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
};

