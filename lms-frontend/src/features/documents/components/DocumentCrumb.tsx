import type { CrumbProps } from '@core/router/route-handle';
import { useDocument } from '../hooks/useDocument';

/** Breadcrumb label for a route with `:courseId` (the class) and `:docId`. */
export const DocumentCrumb = ({ params }: CrumbProps) => (
  <>
    {useDocument(params.courseId ?? '', params.docId ?? '').data?.title ??
      'Document'}
  </>
);
