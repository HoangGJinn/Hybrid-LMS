import { useMyAssignments } from '@features/assignments';
import { useMyClasses } from '@features/courses';
import { useKcMastery } from '@features/mastery';
import { combineQueries } from '@shared/utils/async-state';

/** Everything the student dashboard shows. Reuses the cache of the courses, assignments and mastery pages. */
export const useStudentDashboard = () => {
  const classes = useMyClasses();
  const assignments = useMyAssignments();
  const kcs = useKcMastery();
  return combineQueries(
    [classes, assignments, kcs] as const,
    ([classList, assignmentList, kcList]) => ({
      classes: classList,
      assignments: assignmentList,
      kcs: kcList,
    }),
  );
};
