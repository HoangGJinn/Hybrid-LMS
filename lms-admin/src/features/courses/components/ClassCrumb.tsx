import type { CrumbProps } from '@/core/router/route-handle';
import { useClass } from '../hooks/useClass';

/** Breadcrumb label of /courses/:classId: the class code once it has loaded. */
export const ClassCrumb = ({ params }: CrumbProps) => {
  const { data } = useClass(params.classId ?? '');
  return <>{data?.classCode ?? 'Course'}</>;
};
