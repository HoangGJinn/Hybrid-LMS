import { useState } from 'react';
import { formatDate } from '@/shared/utils/date';
import type { ActiveSemesterOverview } from '../types/dashboard.types';

/** Horizontal term timeline with a "today" marker instead of a bare progress bar. */
export const SemesterTimeline = ({
  semester,
  nowMs,
}: {
  semester: ActiveSemesterOverview;
  nowMs?: number;
}) => {
  const [mountNow] = useState(() => Date.now());
  const referenceNow = nowMs && nowMs > 0 ? nowMs : mountNow;
  const pct = Math.min(100, Math.max(0, semester.progressPercent));
  const notStarted = new Date(semester.startDate).getTime() > referenceNow;
  const ended = semester.daysRemaining === 0 && pct >= 100;
  return (
    <div className="space-y-2">
      <div className="relative h-1.5 w-full rounded-full bg-muted">
        <div
          style={{ width: `${pct}%` }}
          className="h-full rounded-full bg-brand/70"
        />
        {!notStarted && (
          <span
            style={{ left: `${pct}%` }}
            title={`Today · ${pct}% of the term`}
            className="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
          />
        )}
      </div>
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{formatDate(semester.startDate)}</span>
        <span className="font-medium text-foreground">
          {notStarted
            ? 'Not started'
            : ended
              ? 'Ended'
              : `${semester.daysRemaining} days left`}
        </span>
        <span>{formatDate(semester.endDate)}</span>
      </div>
    </div>
  );
};
