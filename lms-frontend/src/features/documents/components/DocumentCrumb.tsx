import type { CrumbProps } from '@core/router/route-handle';
import { useDocument } from '../hooks/useDocument';

/** Breadcrumb label for a route with `:docId`. */
export const DocumentCrumb = ({ params }: CrumbProps) => (
  <>{useDocument(params.docId ?? '').data?.title ?? 'Document'}</>
);
