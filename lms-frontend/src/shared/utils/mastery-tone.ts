/** Tailwind background class for a mastery ratio (0..1): strong / medium / weak. */
export const masteryTone = (p: number) => (p >= 0.7 ? 'bg-emerald-500' : p >= 0.4 ? 'bg-amber-500' : 'bg-destructive')
