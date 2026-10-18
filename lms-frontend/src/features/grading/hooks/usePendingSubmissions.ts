import { useQuery } from '@tanstack/react-query';
import { useLecturerClasses } from '@features/courses';
import { combineQueries } from '@shared/utils/async-state';
import { gradingService } from '../api/grading.service';
import { gradingKeys } from '../api/queryKeys';

/** Submissions of every class the lecturer teaches. Depends on the class list, so it waits for it. */
export const usePendingSubmissions = () => {
  const classes = useLecturerClasses();
  const classIds = (classes.data ?? []).map((classRoom) => classRoom.id);
  const submissions = useQuery({
    queryKey: gradingKeys.pending(classIds),
    queryFn: () => gradingService.getPendingSubmissions(classIds),
    enabled: classes.isSuccess,
  });
  return combineQueries(
    [classes, submissions] as const,
    ([, submissionList]) => submissionList,
  );
};
