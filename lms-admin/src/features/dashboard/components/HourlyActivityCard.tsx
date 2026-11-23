import { useState } from 'react';
import { cn } from '@/shared/utils/cn';
import type { HourlyActivityPoint } from '../types/dashboard.types';
import { formatHourRange, padHour, quietestWindow } from '../utils/chart';
import { Panel } from './Panel';

export const HourlyActivityCard = ({
  points,
}: {
  points: HourlyActivityPoint[];
}) => {
  const [hover, setHover] = useState<number | null>(null);
  const total = points.reduce((sum, p) => sum + p.count, 0);
  const max = Math.max(1, ...points.map((p) => p.count));
  const peak = points.reduce((a, b) => (b.count > a.count ? b : a), points[0]);
  const selected =
    hover !== null ? points.find((p) => p.hour === hover) : undefined;

  return (
    <Panel
      className="h-full"
      title="Activity by hour"
      aside={<span className="text-xs text-muted-foreground">Last 7 days · VN time</span>}
    >
      {total === 0 || !peak ? (
        <p className="m-auto py-10 text-center text-sm text-muted-foreground">
          No activity recorded in the last 7 days.
        </p>
      ) : (
        <>
          <p className="m-0 mb-3 min-h-5 text-xs tabular-nums text-muted-foreground">
            {selected ? (
              <>
                <span className="font-medium text-foreground">
                  {formatHourRange(selected.hour)}
                </span>{' '}
                · {selected.count} events
              </>
            ) : (
              <>
                Peak{' '}
                <span className="font-medium text-foreground">
                  {formatHourRange(peak.hour)}
                </span>{' '}
                · {peak.count} events
              </>
            )}
          </p>
          <div
            className="flex h-28 items-end gap-0.5"
            role="img"
            aria-label="Audit events per hour of day over the last 7 days"
            onMouseLeave={() => setHover(null)}
          >
            {points.map((p) => {
              const isHovered = hover === p.hour;
              return (
                <div
                  key={p.hour}
                  onMouseEnter={() => setHover(p.hour)}
                  className="flex h-full flex-1 cursor-crosshair items-end"
                >
                  <div
                    style={{
                      height: `${Math.max(p.count > 0 ? 4 : 2, (p.count / max) * 100)}%`,
                    }}
                    className={cn(
                      'w-full rounded-t-[2px] transition-colors',
                      p.hour === peak.hour ? 'bg-brand' : 'bg-brand/35',
                      p.count === 0 && 'bg-muted',
                      isHovered && (p.count > 0 ? 'bg-brand/80' : 'bg-muted-foreground/30'),
                    )}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-muted-foreground">
            {[0, 6, 12, 18, 23].map((h) => (
              <span key={h}>{padHour(h)}</span>
            ))}
          </div>
          <p className="m-0 mt-3 border-t pt-3 text-xs text-muted-foreground">
            Quietest window:{' '}
            <span className="font-medium text-foreground">
              {formatHourRange(quietestWindow(points), 3)}
            </span>
          </p>
        </>
      )}
    </Panel>
  );
};
