import type { CrumbProps } from '@core/router/route-handle';
import { useCourseSections } from '../hooks/useCourse';

/** Breadcrumb label for a route with `:courseId` and `:itemId` (a video item). */
export const VideoCrumb = ({ params }: CrumbProps) => {
  const sections = useCourseSections(params.courseId ?? '').data ?? [];
  const item = sections
    .flatMap((section) => section.items)
    .find((candidate) => candidate.id === params.itemId);
  return <>{item?.title ?? 'Video'}</>;
};