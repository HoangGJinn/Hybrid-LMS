import { useMyAssignments } from '@features/assignments';
import { useMyClasses } from '@features/courses';
import { useUpcomingExams } from '@features/exams';
import { useKcMastery } from '@features/mastery';
import { combineQueries } from '@shared/utils/async-state';
import type { CalendarEvent } from '../types/calendar.types';

/** Deadlines, exams and spaced-repetition reviews merged into one chronological list, derived from the cached lists of other features. */
export const useCalendarEvents = () => {
  const classes = useMyClasses();
  const assignments = useMyAssignments();
  const exams = useUpcomingExams();
  const kcs = useKcMastery();
  return combineQueries(
    [classes, assignments, exams, kcs] as const,
    ([classList, assignmentList, examList, kcList]): CalendarEvent[] => {
      const codeOf = (classId: string) =>
        classList.find((c) => c.id === classId)?.classCode ?? null;
      const events: CalendarEvent[] = [
        ...assignmentList.map((a): CalendarEvent => ({
          id: `a-${a.id}`,
          kind: 'ASSIGNMENT',
          title: `${a.title} due`,
          context: codeOf(a.classId),
          at: a.endAt,
          href: `/student/courses/${a.classId}/assignments/${a.id}`,
        })),
        ...examList.map((e): CalendarEvent => ({
          id: `e-${e.id}`,
          kind: 'EXAM',
          title: e.examName,
          context: codeOf(e.classId),
          at: e.startTime,
          href: '/student/exams',
        })),
        ...kcList.flatMap((k): CalendarEvent[] =>
          k.nextReviewAt
            ? [
                {
                  id: `r-${k.id}`,
                  kind: 'REVIEW',
                  title: `Review: ${k.kcName}`,
                  context: null,
                  at: k.nextReviewAt,
                  href: '/student/mastery',
                },
              ]
            : [],
        ),
      ];
      return events.sort((a, b) => +new Date(a.at) - +new Date(b.at));
    },
  );
};
