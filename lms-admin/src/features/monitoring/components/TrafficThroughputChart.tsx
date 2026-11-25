import { useId, useState } from 'react';
import type { TrafficMinutePoint } from '../types/monitoring.types';

const VIEW_W = 640;
const VIEW_H = 168;
const PAD = { top: 10, right: 16, bottom: 24, left: 34 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

const formatMinuteClock = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const TrafficThroughputChart = ({
  points,
}: {
  points: TrafficMinutePoint[];
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const labelId = useId();

  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
        No traffic recorded in the last 60 minutes.
      </div>
    );
  }

  const maxReq = Math.max(
    4,
    ...points.map((p) => p.requests),
  );
  const niceMax = Math.ceil(maxReq / 4) * 4;
  const barStep = PLOT_W / points.length;
  const barWidth = Math.max(2, Math.min(8, barStep * 0.72));
  const hovered = hoveredIdx !== null ? points[hoveredIdx] : null;
  const xTickIndices = [0, Math.floor(points.length / 2), points.length - 1];

  return (
    <div className="space-y-2">
      <div className="flex min-h-4 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        {hovered ? (
          <span className="font-mono tabular-nums text-foreground">
            {formatMinuteClock(hovered.minute)}: {hovered.requests} reqs (
            {hovered.status2xx} ok, {hovered.status4xx} 4xx, {hovered.status5xx}{' '}
            5xx), avg {hovered.avgLatencyMs}ms, p95 {hovered.p95LatencyMs}ms
          </span>
        ) : (
          <span>Last 60 minutes (requests per minute and 5xx errors)</span>
        )}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-[2px] bg-brand/80"
            />
            Requests
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-[2px] bg-destructive"
            />
            5xx errors
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-labelledby={labelId}
        className="block h-44 w-full overflow-visible"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <title id={labelId}>HTTP requests and 5xx errors over 60 minutes</title>

        {[0, 0.5, 1].map((fraction) => {
          const val = Math.round(niceMax * fraction);
          const y = PAD.top + PLOT_H * (1 - fraction);
          return (
            <g key={fraction}>
              <line
                x1={PAD.left}
                x2={VIEW_W - PAD.right}
                y1={y}
                y2={y}
                stroke="hsl(var(--border))"
                strokeDasharray={fraction === 0 ? undefined : '2 3'}
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[10px] font-mono tabular-nums"
              >
                {val}
              </text>
            </g>
          );
        })}

        {points.map((point, index) => {
          const xCenter = PAD.left + barStep * (index + 0.5);
          const x = xCenter - barWidth / 2;
          const totalH = (point.requests / niceMax) * PLOT_H;
          const errH = (point.status5xx / niceMax) * PLOT_H;
          const isHovered = hoveredIdx === index;

          return (
            <g
              key={point.minute}
              onMouseEnter={() => setHoveredIdx(index)}
              className="cursor-crosshair"
            >
              <rect
                x={PAD.left + barStep * index}
                y={PAD.top}
                width={barStep}
                height={PLOT_H}
                fill={isHovered ? 'hsl(var(--muted) / 0.5)' : 'transparent'}
              />
              {totalH > 0 && (
                <rect
                  x={x}
                  y={PAD.top + PLOT_H - totalH}
                  width={barWidth}
                  height={Math.max(1.5, totalH)}
                  rx={1}
                  fill={
                    isHovered
                      ? 'hsl(var(--brand))'
                      : 'hsl(var(--brand) / 0.72)'
                  }
                />
              )}
              {errH > 0 && (
                <rect
                  x={x}
                  y={PAD.top + PLOT_H - errH}
                  width={barWidth}
                  height={Math.max(2, errH)}
                  rx={1}
                  fill="hsl(var(--destructive))"
                />
              )}
            </g>
          );
        })}

        {xTickIndices.map((idx, tickOrder) => {
          const point = points[idx];
          if (!point) return null;
          const x = PAD.left + barStep * (idx + 0.5);
          const anchor =
            tickOrder === 0 ? 'start' : tickOrder === 2 ? 'end' : 'middle';
          const textX =
            tickOrder === 0
              ? PAD.left
              : tickOrder === 2
                ? VIEW_W - PAD.right
                : x;
          return (
            <text
              key={point.minute}
              x={textX}
              y={VIEW_H - 6}
              textAnchor={anchor}
              className="fill-muted-foreground text-[10px] font-mono tabular-nums"
            >
              {formatMinuteClock(point.minute)}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
