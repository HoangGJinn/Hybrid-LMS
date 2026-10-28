/** Escapes `%`, `_` and `\` so user input is matched literally inside LIKE / ILIKE. */
export const escapeLike = (value: string): string =>
  value.replace(/[\\%_]/g, (character) => `\\${character}`);
