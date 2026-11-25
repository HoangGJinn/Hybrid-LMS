const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** Formats a byte count cleanly with binary (1024) units. */
export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  let value = bytes;
  let unitIdx = 0;
  while (value >= 1024 && unitIdx < UNITS.length - 1) {
    value /= 1024;
    unitIdx += 1;
  }
  const formatted =
    unitIdx === 0
      ? String(Math.round(value))
      : value >= 100
        ? value.toFixed(0)
        : value >= 10
          ? value.toFixed(1)
          : value.toFixed(2);
  return `${formatted} ${UNITS[unitIdx]}`;
};

/** Formats uptime seconds into compact "4d 11h 20m", "3h 14m", or "45s". */
export const formatDurationUptime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0s';
  const total = Math.floor(seconds);
  if (total < 60) return `${total}s`;
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

/** Picks semantic meter tone strictly from resource threshold pressure. */
export const getUsageTone = (
  percent: number,
  warnAt = 80,
  critAt = 92,
): 'bg-brand' | 'bg-warning' | 'bg-destructive' => {
  if (percent >= critAt) return 'bg-destructive';
  if (percent >= warnAt) return 'bg-warning';
  return 'bg-brand';
};
