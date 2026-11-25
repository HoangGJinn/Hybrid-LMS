import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Columns2, PanelLeftOpen } from 'lucide-react';
import { useLecturerClasses } from '@features/courses';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
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
import { GradingDeskQueueList } from '../components/GradingDeskQueueList';
import { GradingDeskSpeedGraderDialog } from '../components/GradingDeskSpeedGraderDialog';
import { useGradingQueue } from '../hooks/useGradingQueue';
import {
  filterAndSortGradingQueue,
  gradingProgressByGroup,
  groupGradingQueue,
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
  const [listOpen, setListOpen] = useState(true);

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

  const filteredList = useMemo(
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

  const groups = useMemo(() => groupGradingQueue(filteredList), [filteredList]);
  // Navigation (prev/next, SpeedGrader) follows the grouped order shown on screen.
  const activeList = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const progress = useMemo(() => gradingProgressByGroup(allItems), [allItems]);

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
                      ? 'All caught up'
                      : 'No graded submissions'
                }
                description={
                  hasActiveFilters
                    ? 'Try adjusting or clearing your filters to see other submissions.'
                    : tab === 'PENDING' && sectionGradedCount > 0
                      ? 'Every submission in this section has been graded. Check the "Graded" tab to review or update grades.'
                      : undefined
                }
                action={
                  hasActiveFilters ? (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : tab === 'PENDING' && sectionGradedCount > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateParams({ tab: 'GRADED' });
                        setSelectedQueueId(null);
                      }}
                    >
                      View graded
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
            <div
              className={cn(
                'grid items-start gap-4 lg:gap-6',
                listOpen
                  ? 'lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]'
                  : 'lg:grid-cols-[auto_minmax(0,1fr)]',
              )}
            >
              {listOpen ? (
                <GradingDeskQueueList
                  groups={groups}
                  totalCount={activeList.length}
                  progress={progress}
                  selectedQueueId={selected.queueId}
                  onSelect={setSelectedQueueId}
                  onCollapse={() => setListOpen(false)}
                />
              ) : (
                <button
                  type="button"
                  aria-label="Expand list"
                  title="Show list"
                  onClick={() => setListOpen(true)}
                  className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:flex-col lg:px-2 lg:py-3"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {activeList.length}
                  </span>
                </button>
              )}

              <div className="min-w-0 lg:sticky lg:top-4">
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
              </div>
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