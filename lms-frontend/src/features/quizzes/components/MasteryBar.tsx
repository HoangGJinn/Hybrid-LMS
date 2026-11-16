import { cn } from '@shared/utils/cn';

/** value is 0..1; null means the student has not answered anything on this topic yet. */
export const MasteryBar = ({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) => {
  const pct = value === null ? null : Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between gap-2 text-sm font-medium">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {pct === null ? 'Not started' : `${pct}%`}
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded bg-muted">
        <div
          className={cn(
            'h-2 rounded',
            pct !== null && pct >= 70 ? 'bg-success' : 'bg-primary',
          )}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
    </div>
  );
};