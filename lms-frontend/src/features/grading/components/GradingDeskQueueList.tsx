import { useState } from 'react';
import { ChevronDown, PanelLeftClose } from 'lucide-react';
import { StatusBadge } from '@shared/components/ui/badge';
import { cn } from '@shared/utils/cn';
import type { GradingQueueItem } from '../types/grading.types';
import type { GradingGroup } from '../utils/grading-queue';

export interface GradingDeskQueueListProps {
  groups: GradingGroup[];
  totalCount: number;
  progress: Map<string, { graded: number; total: number }>;
  selectedQueueId: string | undefined;
  onSelect: (queueId: string) => void;
  onCollapse: () => void;
}

const kindBadgeClass = (kind: GradingQueueItem['kind']) =>
  kind === 'exam'
    ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
    : 'bg-sky-500/15 text-sky-700 dark:text-sky-300';

/** Submissions grouped by exam / assignment; each group can be folded. */
export const GradingDeskQueueList = ({
  groups,
  totalCount,
  progress,
  selectedQueueId,
  onSelect,
  onCollapse,
}: GradingDeskQueueListProps) => {
  const [foldedKeys, setFoldedKeys] = useState<Set<string>>(() => new Set());

  const toggleGroup = (key: string) =>
    setFoldedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <section
      aria-label="Submissions"
      className="flex min-w-0 flex-col rounded-xl border bg-card"
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <p className="m-0 text-sm font-semibold">
          Submissions
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {totalCount}
          </span>
        </p>
        <button
          type="button"
          aria-label="Collapse list"
          title="Collapse list"
          onClick={onCollapse}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </header>

      <div className="max-h-[calc(100vh-18rem)] space-y-3 overflow-y-auto p-2">
        {groups.map((group) => {
          const folded = foldedKeys.has(group.key);
          const stat = progress.get(group.key);
          const percent =
            stat && stat.total > 0
              ? Math.round((stat.graded / stat.total) * 100)
              : 0;
          return (
            <div key={group.key} className="rounded-lg border bg-background">
              <button
                type="button"
                aria-expanded={!folded}
                onClick={() => toggleGroup(group.key)}
                className="flex w-full items-start gap-2 rounded-t-lg px-3 py-2 text-left transition-colors hover:bg-accent/40"
              >
                <ChevronDown
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    folded && '-rotate-90',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                        kindBadgeClass(group.kind),
                      )}
                    >
                      {group.kind === 'exam' ? 'Exam' : 'Assignment'}
                    </span>
                    <p className="m-0 truncate text-sm font-semibold">
                      {group.title}
                    </p>
                  </div>
                  {group.className && (
                    <p className="m-0 mt-0.5 truncate text-xs text-muted-foreground">
                      {group.className}
                    </p>
                  )}
                  {stat && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {stat.graded}/{stat.total} graded
                      </span>
                    </div>
                  )}
                </div>
              </button>

              {!folded && (
                <ul className="m-0 list-none divide-y border-t p-0">
                  {group.items.map((s) => {
                    const active = s.queueId === selectedQueueId;
                    return (
                      <li key={s.queueId}>
                        <button
                          type="button"
                          aria-current={active ? 'true' : undefined}
                          onClick={() => onSelect(s.queueId)}
                          className={cn(
                            'flex w-full items-center gap-3 border-l-2 px-3 py-2 text-left transition-colors hover:bg-accent/40',
                            active
                              ? 'border-l-primary bg-accent/50'
                              : 'border-l-transparent',
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="m-0 truncate text-sm font-medium">
                              {s.studentName}
                              {s.studentCode && (
                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                  ({s.studentCode})
                                </span>
                              )}
                            </p>
                            <p className="m-0 text-[11px] text-muted-foreground">
                              {new Date(s.submittedAt).toLocaleString()}
                            </p>
                          </div>
                          {s.score !== null ? (
                            <span className="shrink-0 text-sm font-semibold">
                              {s.score}
                            </span>
                          ) : (
                            <StatusBadge status="SUBMITTED" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};