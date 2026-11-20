/** Text colour class for a 0–10 score. */
export const scoreTone = (score: number): string =>
  score >= 8
    ? 'text-success'
    : score >= 5
      ? 'text-warning'
      : 'text-destructive';