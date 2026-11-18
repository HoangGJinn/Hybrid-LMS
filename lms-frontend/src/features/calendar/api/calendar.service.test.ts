import { describe, expect, it } from 'vitest';
import { calendarService } from './calendar.service';

describe('calendarService.getMyEvents (mock mode)', () => {
  it('should return assignment deadlines and exams inside the range, earliest first', async () => {
    const actualEvents = await calendarService.getMyEvents({
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-11-01T00:00:00.000Z',
    });

    expect(actualEvents.map((e) => e.id)).toEqual([
      'ASSIGNMENT:a2',
      'ASSIGNMENT:a1',
      'EXAM:e2',
      'EXAM:e1',
    ]);
    expect(actualEvents.every((e) => e.classCode !== '')).toBe(true);
  });

  it('should exclude an event that occurs exactly at the end of the range', async () => {
    const actualEvents = await calendarService.getMyEvents({
      from: '2026-10-15T00:00:00.000Z',
      to: '2026-10-15T23:59:00.000Z',
    });

    expect(actualEvents).toEqual([]);
  });

  it('should return an empty list for a range with no events', async () => {
    const actualEvents = await calendarService.getMyEvents({
      from: '2030-01-01T00:00:00.000Z',
      to: '2030-02-01T00:00:00.000Z',
    });

    expect(actualEvents).toEqual([]);
  });
});