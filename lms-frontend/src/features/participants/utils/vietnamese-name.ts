export const ALPHABET = [
  'A', 'Ă', 'Â', 'B', 'C', 'D', 'Đ', 'E', 'Ê', 'F', 'G', 'H', 'I', 'J', 'K',
  'L', 'M', 'N', 'O', 'Ô', 'Ơ', 'P', 'Q', 'R', 'S', 'T', 'U', 'Ư', 'V', 'W',
  'X', 'Y', 'Z',
] as const;

// Breve, circumflex and horn make a different letter; tone marks do not.
const LETTER_MARKS = new Set(['\u0306', '\u0302', '\u031b']);

export const splitName = (fullName: string): { family: string; given: string } => {
  const [family = '', ...given] = fullName.trim().split(/\s+/).filter(Boolean);
  return { family, given: given.join(' ') };
};

/** First letter of a word on the A–Z/Vietnamese alphabet, ignoring tone marks ("Ấn" → "Â", "Ánh" → "A"). */
export const getInitial = (word: string): string => {
  const decomposed = word.trim().normalize('NFD');
  if (decomposed === '') return '';
  const marks = decomposed.slice(1).match(/^[\u0300-\u036f]*/)?.[0] ?? '';
  const kept = [...marks].filter((mark) => LETTER_MARKS.has(mark)).join('');
  return (decomposed[0] + kept).normalize('NFC').toUpperCase();
};