import type { ComponentType } from 'react';
import type { Params } from 'react-router';

export interface CrumbProps {
  params: Params<string>;
}

/** A static label, or a component that resolves the label from route params. */
export type Crumb = string | ComponentType<CrumbProps>;

/** Shape of `handle` on route objects. Routes without a crumb are skipped by <Breadcrumbs />. */
export interface RouteHandle {
  crumb?: Crumb;
}

/** Label shown in <Breadcrumbs /> for a route: `{ path: 'x', ...crumb('Label'), ... }`. */
export const crumb = (label: Crumb): { handle: RouteHandle } => ({
  handle: { crumb: label },
});
