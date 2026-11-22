import { describe, expect, it } from 'vitest';
import { composeZaloMessage, formatDuration, formatVnDateTime } from './zalo-message.util.js';

describe('zalo-message.util', () => {
  it('formats a date in Vietnam time', () => {
    expect(formatVnDateTime(new Date('2099-11-10T08:00:00Z'))).toBe('15:00 10/11/2099');
  });

  it('formats durations in a readable way', () => {
    expect(formatDuration(45 * 60_000)).toBe('45 phút');
    expect(formatDuration(3 * 3_600_000)).toBe('3 giờ');
    expect(formatDuration((2 * 24 + 3) * 3_600_000)).toBe('2 ngày 3 giờ');
  });

  it('composes header, filled fields and footer, skipping empty values', () => {
    const message = composeZaloMessage({
      header: 'HEADER',
      fields: [
        { icon: '📝', label: 'A', value: 'one' },
        { icon: '💬', label: 'B', value: null },
        { icon: '📂', label: 'C', value: 'x\ny' },
      ],
      footer: 'FOOTER',
    });
    expect(message).toContain('HEADER');
    expect(message).toContain('📝 A: one');
    expect(message).not.toContain('B:');
    expect(message).toContain('📂 C:\nx\ny');
    expect(message.endsWith('FOOTER')).toBe(true);
  });
});