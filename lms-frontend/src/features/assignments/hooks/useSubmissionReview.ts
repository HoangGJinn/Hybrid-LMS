import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignmentService } from '../api/assignment.service';
import { assignmentKeys } from '../api/queryKeys';

/** The download links inside the list live a few minutes on the backend, so the cache is dropped just as fast. */
const SUBMISSIONS_STALE_TIME_MS = 4 * 60_000;

/** Lecturer: every submission of one assignment. */
export const useClassSubmissions = (classId: string, assignmentId: string) =>
  useQuery({
    queryKey: assignmentKeys.submissions(assignmentId),
    queryFn: () => assignmentService.getClassSubmissions(classId, assignmentId),
    enabled: classId !== '' && assignmentId !== '',
    staleTime: SUBMISSIONS_STALE_TIME_MS,
    gcTime: SUBMISSIONS_STALE_TIME_MS,
  });

interface GradeInput {
  classId: string;
  assignmentId: string;
  submissionId: string;
  score: number;
  comment: string;
}

/** Lecturer: saves a grade from the assignment page, then refreshes every assignment and submission list. */
export const useGradeInAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      classId,
      assignmentId,
      submissionId,
      score,
      comment,
    }: GradeInput) =>
      assignmentService.grade(
        classId,
        assignmentId,
        submissionId,
        score,
        comment,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
};

interface DownloadInput {
  classId: string;
  assignmentId: string;
  /** Leave out to download every submission. */
  submissionId?: string;
  /** Name of the saved file, without `.zip`. */
  fileName: string;
}

/** Lecturer: downloads submissions as a zip and hands the file to the browser's save dialog. */
export const useDownloadSubmissions = () =>
  useMutation({
    mutationFn: async ({
      classId,
      assignmentId,
      submissionId,
      fileName,
    }: DownloadInput) => {
      const blob = await assignmentService.downloadSubmissionsZip(
        classId,
        assignmentId,
        submissionId,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });