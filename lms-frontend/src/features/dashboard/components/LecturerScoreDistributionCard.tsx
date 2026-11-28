import { useState } from 'react';
import { cn } from '@shared/utils/cn';
import type {
  LecturerClassHealthItem,
  LecturerScoreDistribution,
  ScoreDistributionBucket,
} from '../types/lecturer-dashboard.types';

const EMPTY_BUCKETS: ScoreDistributionBucket[] = [
  { bucket: '<5', count: 0 },
  { bucket: '5-6.5', count: 0 },
  { bucket: '6.5-8', count: 0 },
  { bucket: '8-9', count: 0 },
  { bucket: '9-10', count: 0 },
];

export const LecturerScoreDistributionCard = ({
  distribution,
  classes,
}: {
  distribution: LecturerScoreDistribution;
  classes: LecturerClassHealthItem[];
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const buckets =
    selectedClassId === 'ALL'
      ? distribution.overall
      : (distribution.byClass[selectedClassId] ?? EMPTY_BUCKETS);

  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const belowFiveCount = buckets.find((b) => b.bucket === '<5')?.count ?? 0;
  const passRate =
    total > 0 ? Math.round(((total - belowFiveCount) / total) * 100) : 0;
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <section className="flex h-full min-w-0 flex-col rounded-[5px] border bg-card">
      <header className="flex min-h-[45px] flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h2 className="m-0 text-sm font-semibold">Score distribution</h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {total} graded{total > 0 ? `, ${passRate}% pass` : ''}
          </span>
        </div>
        {classes.length > 1 && (
          <select
            aria-label="Filter score distribution by class"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-[4px] border bg-background px-2 py-1 font-mono text-xs text-foreground"
          >
            <option value="ALL">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.classCode}
              </option>
            ))}
          </select>
        )}
      </header>
      <div className="flex flex-1 flex-col p-4">
        {total === 0 ? (
          <p className="m-auto py-8 text-center text-[13px] text-muted-foreground">
            0 graded scores recorded yet.
          </p>
        ) : (
          <div
            className="flex h-40 items-end gap-3 pt-4"
            role="img"
            aria-label="Distribution of graded scores across five bands"
          >
            {buckets.map((b) => {
              const isBelowFive = b.bucket === '<5' && b.count > 0;
              const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
              return (
                <div
                  key={b.bucket}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <span className="text-xs font-medium tabular-nums text-foreground">
                    {b.count}
                    <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                      ({pct}%)
                    </span>
                  </span>
                  <div className="mx-auto flex h-24 w-full max-w-12 items-end">
                    <div
                      style={{
                        height: `${Math.max(b.count > 0 ? 6 : 2, (b.count / max) * 100)}%`,
                      }}
                      className={cn(
                        'w-full rounded-t-[3px] transition-opacity',
                        b.count === 0
                          ? 'bg-muted'
                          : isBelowFive
                            ? 'bg-destructive/80'
                            : 'bg-brand/85',
                      )}
                    />
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {b.bucket}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
