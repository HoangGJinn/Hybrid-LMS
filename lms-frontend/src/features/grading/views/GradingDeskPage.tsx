import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Columns2 } from 'lucide-react';
import { useLecturerClasses } from '@features/courses';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { StatusBadge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { GradingDeskDetailCard } from '../components/GradingDeskDetailCard';
import {
  GradingDeskFilterBar,
  type GradingSortOrder,
  type GradingTabFilter,
  type GradingTypeFilter,
} from '../components/GradingDeskFilterBar';
import { GradingDeskSpeedGraderDialog } from '../components/GradingDeskSpeedGraderDialog';
import { useGradingQueue } from '../hooks/useGradingQueue';
import {
  filterAndSortGradingQueue,
  parseGradingSort,
  parseGradingTab,
  parseGradingType,
} from '../utils/grading-queue';

const GradingDeskPage = () => {
  const classesQuery = useLecturerClasses();
  const queueQuery = useGradingQueue();
  const state = toAsyncState(queueQuery);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [speedGraderOpen, setSpeedGraderOpen] = useState(false);

  const tab = parseGradingTab(searchParams.get('tab'));
  const typeFilter = parseGradingType(searchParams.get('type'));
  const classFilter = searchParams.get('classId') ?? 'all';
  const searchQuery = searchParams.get('q') ?? '';
  const sortOrder = parseGradingSort(searchParams.get('sort'));

  const hasActiveFilters =
    classFilter !== 'all' ||
    searchQuery.trim() !== '' ||
    sortOrder !== 'newest';

  const updateParams = (
    updates: Partial<{
      tab: GradingTabFilter;
      type: GradingTypeFilter;
      classId: string;
      q: string;
      sort: GradingSortOrder;
    }>,
  ) => {
    const next = new URLSearchParams(searchParams);
    if (updates.tab !== undefined) {
      if (updates.tab === 'PENDING') next.delete('tab');
      else next.set('tab', 'graded');
    }
    if (updates.type !== undefined) {
      if (updates.type === 'exam') next.delete('type');
      else next.set('type', updates.type);
    }
    if (updates.classId !== undefined) {
      if (updates.classId === 'all') next.delete('classId');
      else next.set('classId', updates.classId);
    }
    if (updates.q !== undefined) {
      if (updates.q === '') next.delete('q');
      else next.set('q', updates.q);
    }
    if (updates.sort !== undefined) {
      if (updates.sort === 'newest') next.delete('sort');
      else next.set('sort', updates.sort);
    }
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('classId');
    next.delete('q');
    next.delete('sort');
    setSearchParams(next, { replace: true });
    setSelectedQueueId(null);
  };

  const allItems = useMemo(() => queueQuery.data ?? [], [queueQuery.data]);
  const examItems = useMemo(
    () => allItems.filter((item) => item.kind === 'exam'),
    [allItems],
  );
  const assignmentItems = useMemo(
    () => allItems.filter((item) => item.kind === 'assignment'),
    [allItems],
  );

  const examPendingCount = useMemo(
    () => examItems.filter((item) => item.score === null).length,
    [examItems],
  );
  const assignmentPendingCount = useMemo(
    () => assignmentItems.filter((item) => item.score === null).length,
    [assignmentItems],
  );

  const sectionItems = typeFilter === 'exam' ? examItems : assignmentItems;
  const sectionPendingCount = useMemo(
    () => sectionItems.filter((item) => item.score === null).length,
    [sectionItems],
  );
  const sectionGradedCount = sectionItems.length - sectionPendingCount;

  const activeList = useMemo(
    () =>
      filterAndSortGradingQueue(allItems, {
        tab,
        typeFilter,
        classFilter,
        searchQuery,
        sortOrder,
      }),
    [allItems, tab, typeFilter, classFilter, searchQuery, sortOrder],
  );

  const activeSelected =
    activeList.find((s) => s.queueId === selectedQueueId) ?? activeList[0];

  return (
    <div>
      <PageHeader
        title="Grading Desk"
        actions={
          activeSelected ? (
            <Button size="sm" onClick={() => setSpeedGraderOpen(true)}>
              <Columns2 />
              SpeedGrader
            </Button>
          ) : undefined
        }
      />

      <GradingDeskFilterBar
        tab={tab}
        typeFilter={typeFilter}
        classFilter={classFilter}
        searchQuery={searchQuery}
        sortOrder={sortOrder}
        classes={classesQuery.data ?? []}
        examPendingCount={examPendingCount}
        assignmentPendingCount={assignmentPendingCount}
        sectionPendingCount={sectionPendingCount}
        sectionGradedCount={sectionGradedCount}
        hasActiveFilters={hasActiveFilters}
        onTabChange={(nextTab) => {
          updateParams({ tab: nextTab });
          setSelectedQueueId(null);
        }}
        onTypeChange={(nextType) => {
          updateParams({ type: nextType });
          setSelectedQueueId(null);
        }}
        onClassChange={(nextClassId) => {
          updateParams({ classId: nextClassId });
          setSelectedQueueId(null);
        }}
        onSearchChange={(nextQ) => {
          updateParams({ q: nextQ });
        }}
        onSortChange={(nextSort) => {
          updateParams({ sort: nextSort });
        }}
        onClearFilters={clearFilters}
      />

      <AsyncView
        state={state}
        isEmpty={() => sectionItems.length === 0 && !hasActiveFilters}
        empty={
          <EmptyState
            title={
              typeFilter === 'exam'
                ? 'No exam submissions yet'
                : 'No assignment submissions yet'
            }
          />
        }
      >
        {() => {
          if (activeList.length === 0) {
            return (
              <EmptyState
                title={
                  hasActiveFilters
                    ? 'No matching submissions'
                    : tab === 'PENDING'
                      ? 'Nothing to grade'
                      : 'No graded submissions'
                }
                description={
                  hasActiveFilters
                    ? 'Try adjusting or clearing your filters to see other submissions.'
                    : undefined
                }
                action={
                  hasActiveFilters ? (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            );
          }

          const selected = activeSelected ?? activeList[0];
          const selectedIndex = activeList.findIndex(
            (s) => s.queueId === selected.queueId,
          );

          return (
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <ul className="m-0 list-none space-y-2 p-0">
                {activeList.map((s) => (
                  <li key={s.queueId}>
                    <button
                      type="button"
                      onClick={() => setSelectedQueueId(s.queueId)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/40',
                        selected?.queueId === s.queueId && 'border-primary',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                              s.kind === 'exam'
                                ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                                : 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
                            )}
                          >
                            {s.kind === 'exam' ? 'Exam' : 'Assignment'}
                          </span>
                          <p className="m-0 truncate font-medium">
                            {s.studentName}
                            {s.studentCode ? (
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                ({s.studentCode})
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <p className="m-0 mt-0.5 truncate text-xs text-muted-foreground">
                          {s.title}
                          {s.className ? ` · ${s.className}` : ''}
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
                ))}
              </ul>

              {selected && (
                <GradingDeskDetailCard
                  key={selected.queueId}
                  item={selected}
                  hasPrev={selectedIndex > 0}
                  hasNext={
                    selectedIndex >= 0 && selectedIndex < activeList.length - 1
                  }
                  indexLabel={`${selectedIndex + 1} / ${activeList.length}`}
                  onPrev={() =>
                    selectedIndex > 0 &&
                    setSelectedQueueId(activeList[selectedIndex - 1].queueId)
                  }
                  onNext={() =>
                    selectedIndex >= 0 &&
                    selectedIndex < activeList.length - 1 &&
                    setSelectedQueueId(activeList[selectedIndex + 1].queueId)
                  }
                  onOpenSpeedGrader={() => setSpeedGraderOpen(true)}
                />
              )}
            </div>
          );
        }}
      </AsyncView>

      {speedGraderOpen && activeSelected && activeList.length > 0 && (
        <GradingDeskSpeedGraderDialog
          list={activeList}
          activeQueueId={activeSelected.queueId}
          onSelect={(queueId) => setSelectedQueueId(queueId)}
          onClose={() => setSpeedGraderOpen(false)}
        />
      )}
    </div>
  );
};

export default GradingDeskPage;
