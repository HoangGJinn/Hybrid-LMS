import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../types/calendar.types';
import { getChipClassName, getStatusBadge, KIND_META } from './eventMeta';

const buildEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'x',
  kind: 'ASSIGNMENT',
  title: 'T',
  context: null,
  at: '2026-11-10T00:00:00.000Z',
  endAt: null,
  href: '/x',
  status: 'OPEN',
  isDone: false,
  durationMinutes: null,
  ...overrides,
});

describe('getStatusBadge', () => {
  it('should label an overdue assignment', () => {
    expect(getStatusBadge(buildEvent({ status: 'OVERDUE' }))?.label).toBe(
      'Overdue',
    );
  });

  it('should label an attempted exam as attempted even after it closed', () => {
    const exam = buildEvent({ kind: 'EXAM', status: 'CLOSED', isDone: true });

    expect(getStatusBadge(exam)?.label).toBe('Attempted');
  });

  it('should label a closed exam without attempts as missed', () => {
    const exam = buildEvent({ kind: 'EXAM', status: 'CLOSED' });

    expect(getStatusBadge(exam)?.label).toBe('Missed');
  });

  it('should return no badge for a review', () => {
    expect(
      getStatusBadge(buildEvent({ kind: 'REVIEW', status: null })),
    ).toBeNull();
  });
});

describe('getChipClassName', () => {
  it('should use the danger colour for overdue work', () => {
    expect(getChipClassName(buildEvent({ status: 'OVERDUE' }))).toContain(
      'text-destructive',
    );
  });

  it('should use the colour of its kind otherwise', () => {
    expect(getChipClassName(buildEvent())).toBe(KIND_META.ASSIGNMENT.chip);
  });
});