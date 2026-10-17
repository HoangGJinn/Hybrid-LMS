export const formatScore = (score: number | null | undefined, max = 10) => (score == null ? '—' : `${Number(score.toFixed(1))} / ${max}`)
export const formatPercentage = (ratio: number, digits = 0) => `${(ratio * 100).toFixed(digits)}%`

/** Zero-pads to two digits: 5 -> "05". */
export const pad = (n: number) => String(n).padStart(2, '0')
