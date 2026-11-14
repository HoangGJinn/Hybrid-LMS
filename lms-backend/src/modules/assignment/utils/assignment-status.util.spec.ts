import { describe, expect, it } from 'vitest';
import { AssignmentStatus } from '../enums/assignment-status.enum.js';
import { computeAssignmentStatus } from './assignment-status.util.js';

describe('computeAssignmentStatus', () => {
  const schedule = {
    openAt: new Date('2026-11-10T08:00:00Z'),
    endAt: new Date('2026-11-20T08:00:00Z'),
  };

  it('returns GRADED when submission has a numeric or zero score', () => {
    expect(
      computeAssignmentStatus(
        schedule,
        { score: 0 },
        new Date('2026-11-05T08:00:00Z'),
      ),
    ).toBe(AssignmentStatus.GRADED);

    expect(
      computeAssignmentStatus(
        schedule,
        { score: '8.50' },
        new Date('2026-11-25T08:00:00Z'),
      ),
    ).toBe(AssignmentStatus.GRADED);
  });

  it('returns SUBMITTED when submission exists without a score', () => {
    expect(
      computeAssignmentStatus(
        schedule,
        { score: null },
        new Date('2026-11-25T08:00:00Z'),
      ),
    ).toBe(AssignmentStatus.SUBMITTED);
  });

  it('returns UPCOMING before openAt, OPEN during window, and OVERDUE after endAt', () => {
    expect(
      computeAssignmentStatus(
        schedule,
        null,
        new Date('2026-11-09T08:00:00Z'),
      ),
    ).toBe(AssignmentStatus.UPCOMING);

    expect(
      computeAssignmentStatus(
        schedule,
        null,
        new Date('2026-11-15T08:00:00Z'),
      ),
    ).toBe(AssignmentStatus.OPEN);

    expect(
      computeAssignmentStatus(
        schedule,
        null,
        new Date('2026-11-21T08:00:00Z'),
      ),
    ).toBe(AssignmentStatus.OVERDUE);
  });
});

