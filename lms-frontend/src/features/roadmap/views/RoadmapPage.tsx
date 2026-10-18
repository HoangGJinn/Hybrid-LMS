import { formatDate } from '@shared/utils/format';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { StatusBadge } from '@shared/components/ui/badge';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { useRoadmaps } from '../hooks/useRoadmaps';
import type { RoadmapItemStatus } from '../types/roadmap.types';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const icon: Record<RoadmapItemStatus, { Icon: typeof Circle; cls: string }> = {
  COMPLETED: { Icon: CheckCircle2, cls: 'text-success' },
  IN_PROGRESS: { Icon: Loader2, cls: 'text-brand' },
  PENDING: { Icon: Circle, cls: 'text-muted-foreground' },
};

const RoadmapPage = () => {
  const state = toAsyncState(useRoadmaps());
  return (
    <div>
      <PageHeader
        title="Learning Roadmap"
        subtitle="Your personalized path, adapted to your KC mastery"
      />
      <AsyncView
        state={state}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            title="No roadmap yet"
            description="A roadmap is generated after your first quiz."
          />
        }
      >
        {(roadmaps) => (
          <div className="space-y-6">
            {roadmaps.map((r) => {
              const items = [...r.items].sort(
                (a, b) => b.priorityScore - a.priorityScore,
              );
              const done = items.filter((i) => i.status === 'COMPLETED').length;
              return (
                <section key={r.id} className="rounded-lg border bg-card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="m-0 text-lg font-semibold">{r.title}</h2>
                    <span className="text-sm text-muted-foreground">
                      {done}/{items.length} completed
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No steps in this roadmap.
                    </p>
                  ) : (
                    <ol className="m-0 list-none border-l-2 border-border p-0 pl-6">
                      {items.map((it) => {
                        const { Icon, cls } = icon[it.status];
                        return (
                          <li key={it.id} className="relative pb-5 last:pb-0">
                            <span className="absolute -left-[35px] top-0 rounded-full bg-card">
                              <Icon className={cn('h-5 w-5', cls)} />
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{it.kcName}</span>
                              <StatusBadge status={it.status} />
                              <span className="text-xs text-muted-foreground">
                                Priority {it.priorityScore.toFixed(2)}
                              </span>
                            </div>
                            {it.reason && (
                              <p className="m-0 mt-1 text-sm text-muted-foreground">
                                {it.reason}
                              </p>
                            )}
                            {it.dueDate && (
                              <p className="m-0 mt-1 text-xs text-muted-foreground">
                                Target: {formatDate(it.dueDate)}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </AsyncView>
    </div>
  );
};

export default RoadmapPage;
