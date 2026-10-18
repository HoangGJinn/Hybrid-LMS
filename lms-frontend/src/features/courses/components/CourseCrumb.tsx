import type { CrumbProps } from '@core/router/route-handle';
import { useCourse } from '../hooks/useCourse';

/** Breadcrumb label for a route with `:courseId`. */
export const CourseCrumb = ({ params }: CrumbProps) => (
  <>{useCourse(params.courseId ?? '').data?.name ?? 'Course'}</>
);
