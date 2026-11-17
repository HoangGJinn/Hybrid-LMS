export const normalizeAnswer = (text: string): string =>
  text.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi');

export const isAcceptedAnswer = (typed: string, accepted: readonly string[]): boolean => {
  const value = normalizeAnswer(typed);
  if (value === '') return false;
  return accepted.some((a) => normalizeAnswer(a) === value);
};