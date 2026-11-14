import { useGradingQueue } from '@features/grading';
import { useLecturerClasses } from '@features/courses';
import { combineQueries } from '@shared/utils/async-state';

/** Everything the lecturer dashboard shows. Reuses the cache of the classes and grading pages. */
export const useLecturerDashboard = () => {
  const classes = useLecturerClasses();
  const pending = useGradingQueue();
  return combineQueries(
    [classes, pending] as const,
    ([classList, pendingList]) => ({
      classes: classList,
      pending: pendingList,
    }),
  );
};
