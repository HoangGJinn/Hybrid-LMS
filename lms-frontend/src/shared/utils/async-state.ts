/** Minimal shape shared by a TanStack Query result and by several query results combined together. */
export interface QuerySnapshot<TData> {
  readonly data: TData | undefined;
  readonly isPending?: boolean;
  readonly isLoading?: boolean;
  readonly error: unknown;
  readonly refetch: () => unknown;
}

/** Shape consumed by `<AsyncView />`. */
export interface AsyncState<TData> {
  data: TData | undefined;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

type SnapshotData<TSnapshot> =
  TSnapshot extends QuerySnapshot<infer TData> ? NonNullable<TData> : never;

const FALLBACK_ERROR_MESSAGE = 'Something went wrong';

const toError = (error: unknown): Error | null => {
  if (!error) return null;
  return error instanceof Error ? error : new Error(FALLBACK_ERROR_MESSAGE);
};

/**
 * Adapts a query result to the `<AsyncView />` shape.
 * `null` data (what the hooks return for "not found", because Query v5 rejects `undefined`) becomes `undefined`,
 * so `<AsyncView />` renders its empty state and its render prop always receives a non-null value.
 */
export const toAsyncState = <TData>(
  query: QuerySnapshot<TData>,
): AsyncState<NonNullable<TData>> => ({
  data: query.data ?? undefined,
  loading: query.isPending ?? query.isLoading ?? false,
  error: toError(query.error),
  reload: () => {
    void query.refetch();
  },
});

/**
 * Merges several query results into one. The result is loading while any query is loading, failed as soon as one
 * fails, and has data only once every query has data. `select` receives the data in the same order as `queries`.
 * Not memoized on purpose: `select` should stay cheap and consumers must not rely on `data` identity.
 */
export const combineQueries = <
  const TQueries extends readonly QuerySnapshot<unknown>[],
  TResult,
>(
  queries: TQueries,
  select: (data: {
    [Index in keyof TQueries]: SnapshotData<TQueries[Index]>;
  }) => TResult,
): QuerySnapshot<TResult> => {
  const failedQuery = queries.find((query) => query.error);
  const isReady = queries.every(
    (query) => query.data !== undefined && query.data !== null,
  );
  return {
    data: isReady
      ? select(
          queries.map((query) => query.data) as unknown as {
            [Index in keyof TQueries]: SnapshotData<TQueries[Index]>;
          },
        )
      : undefined,
    isLoading: queries.some((query) => query.isPending ?? query.isLoading),
    isPending: queries.some((query) => query.isPending ?? query.isLoading),
    error: failedQuery?.error ?? null,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
};
