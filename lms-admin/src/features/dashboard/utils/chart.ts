import type { HourlyActivityPoint } from '../types/dashboard.types';

const NICE_FACTORS = [1.2, 1.4, 1.6, 1.8, 2, 3, 4, 5, 6, 8, 10];

/** Returns an even chart Y-axis ceiling so [0, max/2, max] ticks are always exact integers. */
export const niceMax = (value: number): number => {
  if (value <= 2) return 2;
  if (value <= 4) return 4;
  if (value <= 6) return 6;
  if (value <= 8) return 8;
  if (value <= 10) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const factor of NICE_FACTORS) {
    const candidate = Math.round(factor * magnitude);
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
};

/** Formats YYYY-MM-DD as DD/MM; falls back to original string on unexpected shape. */
export const shortDate = (iso: string): string => {
  const parts = iso.split('-');
  if (parts.length !== 3 || !parts[1] || !parts[2]) return iso;
  return `${parts[2]}/${parts[1]}`;
};

export const padHour = (hour: number): string => String(hour).padStart(2, '0');

export const formatHourRange = (hour: number, span = 1): string =>
  `${padHour(hour)}:00–${padHour((hour + span) % 24)}:00`;

/** Quietest block of 3 consecutive hours across the 24h cycle (supports midnight wrap-around). */
export const quietestWindow = (points: HourlyActivityPoint[]): number => {
  if (points.length === 0) return 0;
  const counts = Array.from({ length: 24 }, () => 0);
  for (const point of points) {
    if (point.hour >= 0 && point.hour < 24) {
      counts[point.hour] = point.count;
    }
  }

  let bestStart = 0;
  let bestSum = Number.POSITIVE_INFINITY;
  for (let start = 0; start < 24; start += 1) {
    const sum =
      counts[start] + counts[(start + 1) % 24] + counts[(start + 2) % 24];
    if (sum < bestSum) {
      bestSum = sum;
      bestStart = start;
    }
  }
  return bestStart;
};
