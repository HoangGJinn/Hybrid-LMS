/**
 * NFC + lower-case + collapse whitespace + trim.
 * Use for every name/text comparison so that composed and decomposed Vietnamese diacritics
 * (e.g. text copied from macOS or Word) compare equal.
 */
export function normalizeKey(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}