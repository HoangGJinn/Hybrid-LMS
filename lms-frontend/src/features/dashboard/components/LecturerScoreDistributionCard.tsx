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
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <section className="flex h-full min-w-0 flex-col rounded-[5px] border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h2 className="m-0 text-sm font-semibold">Score distribution</h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {total} graded
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
            className="flex h-36 items-end gap-4 pt-4"
            role="img"
            aria-label="Distribution of graded scores across five bands"
          >
            {buckets.map((b) => {
              const isBelowFive = b.bucket === '<5' && b.count > 0;
              return (
                <div
                  key={b.bucket}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <span className="text-xs font-medium tabular-nums">
                    {b.count}
                  </span>
                  <div className="flex h-24 w-full items-end">
                    <div
                      style={{
                        height: `${Math.max(b.count > 0 ? 6 : 2, (b.count / max) * 100)}%`,
                      }}
                      className={cn(
                        'w-full rounded-t-[3px]',
                        b.count === 0
                          ? 'bg-muted'
                          : isBelowFive
                            ? 'bg-destructive/80'
                            : 'bg-brand/80',
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
