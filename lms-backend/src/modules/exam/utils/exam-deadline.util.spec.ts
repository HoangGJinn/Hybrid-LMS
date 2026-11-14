import { describe, expect, it } from 'vitest';
import {
  computeSessionDeadline,
  isPastDeadlineWithGrace,
} from './exam-deadline.util.js';

describe('exam-deadline.util', () => {
  const exam = {
    endTime: new Date('2026-11-12T10:00:00Z'),
    durationMinutes: 45,
  };

  it('gives the full duration when starting early enough before endTime', () => {
    const startedAt = new Date('2026-11-12T08:15:00Z');
    expect(computeSessionDeadline(exam, startedAt)).toEqual(
      new Date('2026-11-12T09:00:00Z'),
    );
  });

  it('cuts off at endTime when a student starts late', () => {
    const startedAt = new Date('2026-11-12T09:30:00Z');
    expect(computeSessionDeadline(exam, startedAt)).toEqual(
      new Date('2026-11-12T10:00:00Z'),
    );
  });

  it('accepts requests within the 30-second grace period and rejects after it', () => {
    const deadline = new Date('2026-11-12T09:00:00Z');
    expect(
      isPastDeadlineWithGrace(deadline, new Date('2026-11-12T09:00:30Z')),
    ).toBe(false);
    expect(
      isPastDeadlineWithGrace(deadline, new Date('2026-11-12T09:00:30.001Z')),
    ).toBe(true);
  });
});

