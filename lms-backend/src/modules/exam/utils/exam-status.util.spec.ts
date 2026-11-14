import { describe, expect, it } from 'vitest';
import { ExamFormat } from '../enums/exam-format.enum.js';
import { ExamStatus } from '../enums/exam-status.enum.js';
import {
  isContentLocked,
  resolveExamMaxAttempts,
  resolveExamStatus,
} from './exam-status.util.js';

const exam = {
  startTime: new Date('2026-11-10T08:00:00Z'),
  endTime: new Date('2026-11-10T10:00:00Z'),
};

describe('resolveExamStatus', () => {
  it.each([
    ['one millisecond before the start', '2026-11-10T07:59:59.999Z', ExamStatus.UPCOMING],
    ['exactly at the start', '2026-11-10T08:00:00Z', ExamStatus.OPEN],
    ['one millisecond before the end', '2026-11-10T09:59:59.999Z', ExamStatus.OPEN],
    ['exactly at the end', '2026-11-10T10:00:00Z', ExamStatus.CLOSED],
  ])('should be %s -> %s', (_label, now, expected) => {
    expect(resolveExamStatus(exam, new Date(now))).toBe(expected);
  });
});

describe('isContentLocked', () => {
  it('should stay open to changes only while upcoming with no session', () => {
    expect(isContentLocked(ExamStatus.UPCOMING, 0)).toBe(false);
  });

  it.each([
    [ExamStatus.UPCOMING, 1],
    [ExamStatus.OPEN, 0],
    [ExamStatus.CLOSED, 0],
  ])('should lock for %s with %i sessions', (status, started) => {
    expect(isContentLocked(status, started)).toBe(true);
  });
});

describe('resolveExamMaxAttempts', () => {
  it('forces 1 attempt for FILE exams and preserves configured/unlimited attempts for MCQ', () => {
    expect(
      resolveExamMaxAttempts({ format: ExamFormat.FILE, maxAttempts: 5 }),
    ).toBe(1);
    expect(
      resolveExamMaxAttempts({ format: ExamFormat.MULTIPLE_CHOICE }),
    ).toBe(1);
    expect(
      resolveExamMaxAttempts({
        format: ExamFormat.MULTIPLE_CHOICE,
        maxAttempts: null,
      }),
    ).toBeNull();
    expect(
      resolveExamMaxAttempts({
        format: ExamFormat.MULTIPLE_CHOICE,
        maxAttempts: 3,
      }),
    ).toBe(3);
  });
});

