import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

/** Renders loading / error / empty / data in one place. */
export function AsyncView<T>({
  state,
  isEmpty,
  empty,
  children,
}: {
  state: {
    data: T | undefined;
    loading: boolean;
    error: Error | null;
    reload: () => void;
  };
  isEmpty?: (d: T) => boolean;
  empty?: ReactNode;
  children: (d: T) => ReactNode;
}) {
  if (state.loading) return <LoadingState />;
  if (state.error)
    return <ErrorState message={state.error.message} onRetry={state.reload} />;
  if (state.data === undefined || (isEmpty && isEmpty(state.data)))
    return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  return <>{children(state.data)}</>;
}
