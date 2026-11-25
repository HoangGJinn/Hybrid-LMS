import { cn } from '@/shared/utils/cn';
import { getUsageTone } from '../utils/format-bytes';

export interface ResourceMeterProps {
  label: string;
  valueText: string;
  percent: number;
  detail?: string;
  warnAt?: number;
  critAt?: number;
}

/** Compact horizontal bar meter with semantic pressure coloring and tabular readouts. */
export const ResourceMeter = ({
  label,
  valueText,
  percent,
  detail,
  warnAt = 80,
  critAt = 92,
}: ResourceMeterProps) => {
  const clamped = Math.min(100, Math.max(0, percent));
  const toneClass = getUsageTone(clamped, warnAt, critAt);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-mono tabular-nums text-foreground">
          {valueText}{' '}
          <span className="text-muted-foreground">({clamped.toFixed(1)}%)</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-[2px] bg-muted"
      >
        <div
          className={cn('h-full rounded-[2px] transition-[width] duration-300', toneClass)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {detail && <p className="m-0 text-[11px] text-muted-foreground">{detail}</p>}
    </div>
  );
};
