/** "Nguyen Van A" -> "VA" (last two words). */
export const initials = (name?: string | null): string =>
  (name ?? 'Admin')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
