/** Resolves with `value` after `ms`, simulating network latency. */
export const delay = <T>(value: T, ms = 300): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));
