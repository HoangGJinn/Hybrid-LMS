import { useEffect, useRef, useState } from 'react';
import { cn } from '@shared/utils/cn';
import type {
  LecturerSubmissionTrendPoint,
  LecturerTrendDays,
} from '../types/lecturer-dashboard.types';
import { formatShortDate, niceChartMax } from '../utils/lecturer-dashboard.utils';

const RANGES: { value: LecturerTrendDays; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 14, label: '14d' },
  { value: 30, label: '30d' },
];

const DEFAULT_W = 640;
const H = 180;
const PAD = { top: 10, right: 8, bottom: 22, left: 28 };

export const LecturerSubmissionTrendCard = ({
  points,
  days,
  onDaysChange,
}: {
  points: LecturerSubmissionTrendPoint[];
  days: LecturerTrendDays;
  onDaysChange: (days: LecturerTrendDays) => void;
}) => {
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(DEFAULT_W);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0);
      if (next > 0) setWidth(Math.max(240, next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasData = points.some((p) => p.submitted > 0 || p.graded > 0);
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = niceChartMax(
    Math.max(1, ...points.map((p) => Math.max(p.submitted, p.graded))),
  );
  const step = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const x = (i: number) =>
    points.length === 1 ? PAD.left + innerW / 2 : PAD.left + i * step;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const line = (key: 'submitted' | 'graded') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p[key])}`).join(' ');
  const area =
    points.length > 1
      ? `${line('submitted')} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
      : '';

  const active = hover ?? points.length - 1;
  const current = points[active];
  const labelEvery = points.length > 14 ? 5 : points.length > 7 ? 2 : 1;
  const ticks = [0, max / 2, max];

  return (
    <section className="flex h-full min-w-0 flex-col rounded-[5px] border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="m-0 text-sm font-semibold">Submissions vs graded</h2>
        <div
          role="group"
          aria-label="Submission trend window"
          className="inline-flex rounded-[4px] border bg-muted/50 p-0.5"
        >
          {RANGES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={days === opt.value}
              onClick={() => onDaysChange(opt.value)}
              className={cn(
                'rounded-[3px] border-0 px-2 py-0.5 text-xs font-medium transition-colors',
                days === opt.value
                  ? 'bg-card text-foreground'
                  : 'bg-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>
      <div className="flex flex-1 flex-col p-4" ref={containerRef}>
        {!hasData ? (
          <p className="m-auto py-8 text-center text-[13px] text-muted-foreground">
            0 submissions or grading events in the last {days} days.
          </p>
        ) : (
          <>
            <p className="m-0 mb-2 min-h-5 text-xs tabular-nums text-muted-foreground">
              {current && (
                <>
                  <span className="font-medium text-foreground">
                    {formatShortDate(current.date)}
                  </span>
                  {', '}
                  {current.submitted} submitted, {current.graded} graded
                </>
              )}
            </p>
            <svg
              viewBox={`0 0 ${width} ${H}`}
              className="block h-[180px] w-full"
              role="img"
              aria-label="Daily student submissions and graded items"
              onMouseLeave={() => setHover(null)}
            >
              {ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={y(t)}
                    y2={y(t)}
                    stroke="hsl(var(--border))"
                    strokeDasharray={t === 0 ? undefined : '2 4'}
                  />
                  <text
                    x={PAD.left - 6}
                    y={y(t) + 3}
                    textAnchor="end"
                    fontSize="10"
                    fill="hsl(var(--muted-foreground))"
                  >
                    {Math.round(t)}
                  </text>
                </g>
              ))}
              {area && <path d={area} fill="hsl(var(--brand))" opacity="0.1" />}
              <path
                d={line('graded')}
                fill="none"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <path
                d={line('submitted')}
                fill="none"
                stroke="hsl(var(--brand))"
                strokeWidth="2"
              />
              {hover !== null && current && (
                <>
                  <line
                    x1={x(hover)}
                    x2={x(hover)}
                    y1={PAD.top}
                    y2={y(0)}
                    stroke="hsl(var(--foreground))"
                    strokeOpacity="0.25"
                  />
                  <circle
                    cx={x(hover)}
                    cy={y(current.graded)}
                    r="3"
                    fill="hsl(var(--card))"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={x(hover)}
                    cy={y(current.submitted)}
                    r="3.5"
                    fill="hsl(var(--brand))"
                  />
                </>
              )}
              {points.map((p, i) =>
                i % labelEvery === 0 || i === points.length - 1 ? (
                  <text
                    key={p.date}
                    x={x(i)}
                    y={H - 6}
                    textAnchor="middle"
                    fontSize="10"
                    fill="hsl(var(--muted-foreground))"
                  >
                    {formatShortDate(p.date)}
                  </text>
                ) : null,
              )}
              {points.map((p, i) => {
                const left =
                  points.length === 1
                    ? PAD.left
                    : Math.max(PAD.left, x(i) - step / 2);
                const right =
                  points.length === 1
                    ? width - PAD.right
                    : Math.min(width - PAD.right, x(i) + step / 2);
                return (
                  <rect
                    key={`hit-${p.date}`}
                    x={left}
                    y={PAD.top}
                    width={Math.max(right - left, 4)}
                    height={innerH}
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHover(i)}
                  />
                );
              })}
            </svg>
            <ul className="m-0 mt-2 flex flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-muted-foreground">
              <li className="flex list-none items-center gap-1.5">
                <span className="h-0.5 w-4 bg-brand" /> Submitted
              </li>
              <li className="flex list-none items-center gap-1.5">
                <span className="h-0 w-4 border-t border-dashed border-muted-foreground" />
                Graded
              </li>
            </ul>
          </>
        )}
      </div>
    </section>
  );
};
