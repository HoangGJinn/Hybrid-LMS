import type { CrumbProps } from '@core/router/route-handle';
import { useLecturerExam } from '../hooks/useLecturerExam';

/** Breadcrumb label for a lecturer route with `:courseId` (the class) and `:examId`. */
export const LecturerExamCrumb = ({ params }: CrumbProps) => (
  <>
    {useLecturerExam(params.courseId ?? '', params.examId ?? '').data
      ?.examName ?? 'Exam'}
  </>
);
