export const LoadingState = ({ rows = 5 }: { rows?: number }) => (
  <div
    className="space-y-2 rounded-xl border bg-card p-4"
    aria-busy="true"
    role="status"
    aria-label="Loading"
  >
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="h-11 w-full animate-pulse rounded-md bg-muted" />
    ))}
  </div>
);
