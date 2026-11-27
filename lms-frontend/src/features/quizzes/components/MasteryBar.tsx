import { cn } from '@shared/utils/cn';
import type { MasteryConfidence, MasteryLevel } from '../types/quizzes.types';
import { LEVEL_LABEL, LEVEL_TONE } from './mastery-display';

/**
 * value is 0..1; null means the student has not answered anything on this topic yet.
 * With a level the bar also names it, and says so when the estimate rests on very few answers.
 */
export const MasteryBar = ({
  label,
  value,
  level,
  confidence,
}: {
  label: string;
  value: number | null;
  level?: MasteryLevel;
  confidence?: MasteryConfidence;
}) => {
  const pct = value === null ? null : Math.round(value * 100);
  const roughly = pct !== null && confidence === 'LOW';
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm font-medium">
        <span className="min-w-0 flex-1">{label}</span>
        {level && level !== 'NEW' && (
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', LEVEL_TONE[level])}>
            {LEVEL_LABEL[level]}
          </span>
        )}
        <span className="shrink-0 text-muted-foreground">
          {pct === null ? 'Not started' : `${pct}%`}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 rounded bg-muted"
        role="progressbar"
        aria-label={`${label} mastery`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? 0}
      >
        <div
          className={cn(
            'h-2 rounded',
            pct !== null && pct >= 70 ? 'bg-success' : 'bg-primary',
          )}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
      {roughly && (
        <div className="mt-1 text-xs text-muted-foreground">
          Rough estimate: only a few answers so far.
        </div>
      )}
    </div>
  );
};
