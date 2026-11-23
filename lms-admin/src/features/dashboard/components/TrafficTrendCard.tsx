import { useEffect, useRef, useState } from 'react';
import type {
  LoginTrendPoint,
  TrafficOverviewStats,
  TrendDays,
} from '../types/dashboard.types';
import { niceMax, shortDate } from '../utils/chart';
import { Panel, Segmented } from './Panel';

const RANGES: { value: TrendDays; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 14, label: '14d' },
  { value: 30, label: '30d' },
];

const DEFAULT_W = 640;
const H = 190;
const PAD = { top: 10, right: 8, bottom: 22, left: 28 };

const TrendChart = ({ points }: { points: LoginTrendPoint[] }) => {
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

  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = niceMax(
    Math.max(1, ...points.map((p) => Math.max(p.succeeded, p.activeUsers, p.failed))),
  );
  const step = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const x = (i: number) =>
    points.length === 1 ? PAD.left + innerW / 2 : PAD.left + i * step;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const line = (key: 'succeeded' | 'activeUsers') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p[key])}`).join(' ');
  const area =
    points.length > 1
      ? `${line('succeeded')} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
      : '';

  const active = hover ?? points.length - 1;
  const current = points[active];
  const labelEvery = points.length > 14 ? 5 : points.length > 7 ? 2 : 1;
  const ticks = [0, max / 2, max];
  const barW = Math.min(10, Math.max(4, step * 0.35));

  return (
    <div ref={containerRef} className="w-full">
      <p className="m-0 mb-2 min-h-5 text-xs tabular-nums text-muted-foreground">
        {current && (
          <>
            <span className="font-medium text-foreground">
              {shortDate(current.date)}
            </span>
            {' · '}
            {current.succeeded} logins · {current.activeUsers} active users ·{' '}
            <span className={current.failed > 0 ? 'text-destructive' : ''}>
              {current.failed} failed
            </span>
          </>
        )}
      </p>
      <svg
        viewBox={`0 0 ${width} ${H}`}
        className="block h-[190px] w-full"
        role="img"
        aria-label="Logins, active users and failed security events per day"
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
          d={line('activeUsers')}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <path d={line('succeeded')} fill="none" stroke="hsl(var(--brand))" strokeWidth="2" />
        {points.map((p, i) => {
          if (p.failed <= 0) return null;
          const barH = Math.max(2, y(0) - y(p.failed));
          return (
            <rect
              key={p.date}
              x={x(i) - barW / 2}
              y={y(0) - barH}
              width={barW}
              height={barH}
              rx="1"
              fill="hsl(var(--destructive))"
              opacity="0.85"
            />
          );
        })}
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
              cy={y(current.activeUsers)}
              r="3"
              fill="hsl(var(--card))"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1.5"
            />
            <circle cx={x(hover)} cy={y(current.succeeded)} r="3.5" fill="hsl(var(--brand))" />
            {current.failed > 0 && (
              <circle
                cx={x(hover)}
                cy={Math.min(y(0) - 2, y(current.failed))}
                r="2.5"
                fill="hsl(var(--destructive))"
              />
            )}
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
              {shortDate(p.date)}
            </text>
          ) : null,
        )}
        {points.map((p, i) => {
          const left =
            points.length === 1 ? PAD.left : Math.max(PAD.left, x(i) - step / 2);
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
          <span className="h-0.5 w-4 bg-brand" /> Logins
        </li>
        <li className="flex list-none items-center gap-1.5">
          <span className="h-0 w-4 border-t border-dashed border-muted-foreground" />
          Active users
        </li>
        <li className="flex list-none items-center gap-1.5">
          <span className="h-2 w-1.5 rounded-[1px] bg-destructive" /> Failed / blocked
        </li>
      </ul>
    </div>
  );
};

const Figure = ({
  label,
  value,
  live,
}: {
  label: string;
  value: number;
  live?: boolean;
}) => (
  <div>
    <p className="m-0 flex items-center gap-1.5 text-xs text-muted-foreground">
      {live && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
      {label}
    </p>
    <p className="m-0 mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
  </div>
);

export const TrafficTrendCard = ({
  traffic,
  points,
  days,
  onDaysChange,
}: {
  traffic: TrafficOverviewStats;
  points: LoginTrendPoint[];
  days: TrendDays;
  onDaysChange: (days: TrendDays) => void;
}) => {
  const hasData = points.some((p) => p.succeeded + p.failed + p.activeUsers > 0);
  return (
    <Panel
      className="h-full"
      title="Traffic"
      aside={
        <Segmented
          label="Trend range"
          value={days}
          options={RANGES}
          onChange={onDaysChange}
        />
      }
    >
      <div className="mb-4 grid grid-cols-3 gap-4 border-b pb-4">
        <Figure label="Online now" value={traffic.onlineNowCount} live />
        <Figure label="Active today" value={traffic.activeUsersTodayCount} />
        <Figure label="Logins today" value={traffic.loginsTodayCount} />
      </div>
      {hasData ? (
        <TrendChart points={points} />
      ) : (
        <p className="m-auto py-10 text-center text-sm text-muted-foreground">
          No login activity recorded in the last {days} days.
        </p>
      )}
    </Panel>
  );
};
