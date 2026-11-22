import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useKcMastery } from '@features/mastery';
import { combineQueries } from '@shared/utils/async-state';
import { calendarService } from '../api/calendar.service';
import { calendarKeys } from '../api/queryKeys';
import type { CalendarEvent } from '../types/calendar.types';
import {
  getVisibleRange,
  sortByTime,
  toCalendarEvents,
} from '../utils/calendarUtils';

/**
 * Deadlines and exams of the month on screen, plus spaced-repetition reviews, in one chronological list.
 * Deadlines and exams are fetched per visible range; the previous month stays on screen while the next one loads.
 * Reviews are optional: while they load, or if they fail, the calendar still shows deadlines and exams.
 */
export const useCalendarEvents = (month: Date) => {
  const { from, to } = getVisibleRange(month);
  const schedule = useQuery({
    queryKey: calendarKeys.range(from, to),
    queryFn: () => calendarService.getMyEvents({ from, to }),
    select: toCalendarEvents,
    placeholderData: keepPreviousData,
  });
  const kcs = useKcMastery();
  const kcList = kcs.data;
  const reviews = useMemo(
    (): CalendarEvent[] =>
      (kcList ?? []).flatMap((k): CalendarEvent[] =>
        k.nextReviewAt
          ? [
              {
                id: `r-${k.id}`,
                kind: 'REVIEW',
                title: `Review: ${k.kcName}`,
                context: null,
                at: k.nextReviewAt,
                endAt: null,
                href: '/student/mastery',
                status: null,
                isDone: false,
                durationMinutes: null,
              },
            ]
          : [],
      ),
    [kcList],
  );
  return combineQueries(
    [schedule] as const,
    ([scheduled]): CalendarEvent[] => sortByTime([...scheduled, ...reviews]),
  );
};