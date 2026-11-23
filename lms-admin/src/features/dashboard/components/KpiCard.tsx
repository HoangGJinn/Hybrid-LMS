import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/shared/utils/cn';

export interface Segment {
  label: string;
  value: number;
  /** Tailwind background class for the bar segment and legend dot. */
  tone: string;
  /** Makes the legend entry a link (e.g. "10 not signed in" -> user list). */
  to?: string;
}

/** Proportional stacked bar; the legend lists only segments that have a value. */
export const StackedBar = ({ segments }: { segments: Segment[] }) => {
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className="space-y-2">
      <div
        className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={visible.map((s) => `${s.label}: ${s.value}`).join(', ')}
      >
        {visible.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.value / total) * 100}%` }}
            className={s.tone}
          />
        ))}
      </div>
      <ul className="m-0 flex flex-wrap gap-x-3 gap-y-0.5 p-0 text-xs text-muted-foreground">
        {visible.map((s) => {
          const content = (
            <>
              <span className={cn('h-1.5 w-1.5 rounded-full', s.tone)} />
              <span className="tabular-nums text-foreground">{s.value}</span>
              {s.label}
              {s.to && <span aria-hidden="true">→</span>}
            </>
          );
          return (
            <li key={s.label} className="list-none">
              {s.to ? (
                <Link
                  to={s.to}
                  className="flex items-center gap-1.5 text-inherit no-underline hover:text-brand"
                >
                  {content}
                </Link>
              ) : (
                <span className="flex items-center gap-1.5">{content}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const KpiCard = ({
  label,
  value,
  to,
  children,
}: {
  label: string;
  value: ReactNode;
  /** Optional "View all" destination shown in the card header. */
  to?: string;
  children: ReactNode;
}) => (
  <div className="flex h-full flex-col gap-3 rounded-md border bg-card p-4">
    <div className="flex items-center justify-between gap-2">
      <p className="m-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {to && (
        <Link
          to={to}
          className="text-xs font-medium text-brand no-underline hover:underline"
        >
          View all →
        </Link>
      )}
    </div>
    <p className="m-0 text-3xl font-semibold leading-none tabular-nums">
      {value}
    </p>
    <div className="mt-auto">{children}</div>
  </div>
);
