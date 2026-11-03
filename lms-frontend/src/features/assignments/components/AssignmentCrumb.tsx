import type { CrumbProps } from '@core/router/route-handle';
import { useAssignmentDetail } from '../hooks/useAssignmentDetail';

/** Breadcrumb label for a route with `:courseId` (the class) and `:assignmentId`. */
export const AssignmentCrumb = ({ params }: CrumbProps) => (
  <>
    {useAssignmentDetail(params.courseId ?? '', params.assignmentId ?? '').data
      ?.title ?? 'Assignment'}
  </>
);