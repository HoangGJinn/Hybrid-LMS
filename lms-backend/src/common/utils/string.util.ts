/**
 * Trims a string and returns it, or returns null if the trimmed string is empty, null, or undefined.
 */
export const emptyToNull = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
};

/**
 * Trims a string and returns it, or returns undefined if the trimmed string is empty, null, or undefined.
 */
export const emptyToUndefined = (
  value?: string | null,
): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
};

