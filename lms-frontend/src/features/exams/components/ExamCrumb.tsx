import type { CrumbProps } from '@core/router/route-handle';
import { useExam } from '../hooks/useExam';

/** Breadcrumb label for a route with `:examId`. */
export const ExamCrumb = ({ params }: CrumbProps) => (
  <>{useExam(params.examId ?? '').data?.examName ?? 'Exam'}</>
);
