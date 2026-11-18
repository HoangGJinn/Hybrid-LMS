import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarService } from '../api/calendar.service';
import { calendarKeys } from '../api/queryKeys';
import type { CalendarEvent } from '../types/calendar.types';
import { addDays, startOfDay, toCalendarEvents } from '../utils/calendarUtils';

export const UPCOMING_WINDOW_DAYS = 14;

/** Not-yet-done assignments and exams from today on, whichever month the grid is showing. */
export const useUpcomingDeadlines = () => {
  // Fixed for the lifetime of the page so the query key does not change on every render.
  const [today] = useState(() => startOfDay(new Date()));
  const from = today.toISOString();
  const to = addDays(today, UPCOMING_WINDOW_DAYS).toISOString();
  return useQuery({
    queryKey: calendarKeys.range(from, to),
    queryFn: () => calendarService.getMyEvents({ from, to }),
    select: (events): CalendarEvent[] =>
      toCalendarEvents(events).filter((event) => !event.isDone),
  });
};