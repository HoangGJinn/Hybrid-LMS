import type { CrumbProps } from '@core/router/route-handle';
import { useAssignment } from '../hooks/useAssignment';

/** Breadcrumb label for a route with `:assignmentId`. */
export const AssignmentCrumb = ({ params }: CrumbProps) => (
  <>{useAssignment(params.assignmentId ?? '').data?.title ?? 'Assignment'}</>
);
