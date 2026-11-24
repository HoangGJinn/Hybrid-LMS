import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatDurationUptime,
  getUsageTone,
} from './format-bytes';

describe('monitoring formatting utilities', () => {
  it('formats byte values cleanly across B, KB, MB, GB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.50 KB');
    expect(formatBytes(256 * 1024 * 1024)).toBe('256 MB');
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe('1.50 GB');
  });

  it('formats uptime durations compactly', () => {
    expect(formatDurationUptime(45)).toBe('45s');
    expect(formatDurationUptime(540)).toBe('9m');
    expect(formatDurationUptime(3 * 3600 + 14 * 60)).toBe('3h 14m');
    expect(formatDurationUptime(4 * 86_400 + 11 * 3600 + 20 * 60)).toBe(
      '4d 11h 20m',
    );
  });

  it('maps resource utilization percentages to semantic tones', () => {
    expect(getUsageTone(45)).toBe('bg-brand');
    expect(getUsageTone(80)).toBe('bg-warning');
    expect(getUsageTone(92)).toBe('bg-destructive');
  });
});
