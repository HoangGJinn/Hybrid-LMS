import { useState } from 'react';
import { Link } from 'react-router';
import { Clock, Search } from 'lucide-react';
import { formatDateTime } from '@shared/utils/format';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { StatusBadge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { useUpcomingExams } from '../hooks/useExams';
import type { ExamStatus, StudentExamSummary } from '../types/exams.types';

type Filter = 'ALL' | ExamStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'CLOSED', label: 'Closed' },
];

/** Only exams that need attention get a colour bar; closed ones stay quiet (transparent keeps alignment). */
const STATUS_BAR: Record<ExamStatus, string> = {
  OPEN: 'border-l-primary',
  UPCOMING: 'border-l-warning',
  CLOSED: 'border-l-transparent',
};

const STATUS_RANK: Record<ExamStatus, number> = {
  OPEN: 0,
  UPCOMING: 1,
  CLOSED: 2,
};

/**
 * One shared column template for the header and every row, so columns line up.
 * The last column has a fixed width, so the button label can no longer shift the others.
 */
const COLS =
  'items-center gap-x-4 gap-y-2 border-l-4 px-4 sm:grid-cols-[minmax(0,1fr)_5.5rem_6.5rem_9rem]';

const canAttempt = (e: StudentExamSummary) =>
  e.status === 'OPEN' &&
  (e.maxAttempts === null || e.attemptsUsed < e.maxAttempts);

type ActionVariant = 'default' | 'outline' | 'ghost';

/** Button label follows the exam's state, not only the attempt count. */
const getAction = (
  e: StudentExamSummary,
): { label: string; variant: ActionVariant } => {
  if (e.inProgressSessionId) {
    return { label: 'Continue attempt', variant: 'default' };
  }
  if (canAttempt(e)) {
    return {
      label: e.attemptsUsed > 0 ? 'Retake' : 'Start exam',
      variant: 'default',
    };
  }
  if (e.attemptsUsed > 0) return { label: 'View result', variant: 'outline' };
  return { label: 'View details', variant: 'ghost' };
};

/** OPEN first, then UPCOMING (soonest first), then CLOSED (most recently closed first). */
const compareExams = (a: StudentExamSummary, b: StudentExamSummary) =>
  STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
  (a.status === 'CLOSED'
    ? +new Date(b.endTime) - +new Date(a.endTime)
    : +new Date(a.startTime) - +new Date(b.startTime));

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

const whenLabel = (e: StudentExamSummary): string => {
  if (e.status === 'OPEN') return `Closes ${formatDateTime(e.endTime)}`;
  if (e.status === 'UPCOMING') return `Opens ${formatDateTime(e.startTime)}`;
  return `Ended ${formatDateTime(e.endTime)}`;
};

const scoreTone = (score: number): string =>
  score >= 8
    ? 'text-success'
    : score >= 5
      ? 'text-warning'
      : 'text-destructive';

const ScoreCell = ({ exam: e }: { exam: StudentExamSummary }) => {
  if (e.showResults && e.bestScore !== null) {
    return (
      <span
        className={cn('text-lg font-bold tabular-nums', scoreTone(e.bestScore))}
      >
        <span className="mr-1 text-xs font-medium text-muted-foreground sm:hidden">
          Best
        </span>
        {e.bestScore.toFixed(2)}
        <span className="ml-0.5 text-xs font-medium text-muted-foreground">
          /10
        </span>
      </span>
    );
  }
  const note =
    !e.showResults && e.attemptsUsed > 0
      ? 'Results hidden'
      : e.format === 'FILE' && e.attemptsUsed > 0
        ? 'Awaiting grade'
        : e.status === 'CLOSED' && e.attemptsUsed === 0
          ? 'Missed'
          : null;
  return note ? (
    <span className="text-xs text-muted-foreground">{note}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
};

const ExamRow = ({ exam: e }: { exam: StudentExamSummary }) => {
  const action = getAction(e);
  return (
    <li className={cn('grid py-3', COLS, STATUS_BAR[e.status])}>
      <div className="min-w-0">
        <p className="m-0 truncate font-semibold">{e.examName}</p>
        <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {e.status !== 'CLOSED' && <StatusBadge status={e.status} />}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {whenLabel(e)}
          </span>
          <span>· {formatDuration(e.durationMinutes)}</span>
        </p>
      </div>

      <div className="text-sm tabular-nums">
        <span className="font-medium">{e.attemptsUsed}</span>
        <span className="text-muted-foreground"> / {e.maxAttempts ?? '∞'}</span>
        <span className="ml-1 text-xs text-muted-foreground sm:hidden">
          attempts
        </span>
      </div>

      <div>
        <ScoreCell exam={e} />
      </div>

      <Button asChild size="sm" variant={action.variant} className="w-full">
        <Link to={`/student/courses/${e.classId}/exams/${e.id}`}>
          {action.label}
        </Link>
      </Button>
    </li>
  );
};

const ExamsPage = () => {
  const state = toAsyncState(useUpcomingExams());
  const [filter, setFilter] = useState<Filter>('ALL');
  const [classId, setClassId] = useState('ALL');
  const [query, setQuery] = useState('');

  return (
    <div>
      <PageHeader title="Exams" />
      <AsyncView
        state={state}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState title="No exams scheduled" />}
      >
        {(exams) => {
          const courses = [
            ...new Map(exams.map((e) => [e.classId, e.className])).entries(),
          ];
          const countOf = (f: Filter) =>
            f === 'ALL'
              ? exams.length
              : exams.filter((e) => e.status === f).length;

          const needle = query.trim().toLowerCase();
          const visible = exams
            .filter(
              (e) =>
                (filter === 'ALL' || e.status === filter) &&
                (classId === 'ALL' || e.classId === classId) &&
                e.examName.toLowerCase().includes(needle),
            )
            .sort(compareExams);

          const groups = [...new Set(visible.map((e) => e.classId))]
            .map((id) => {
              const items = visible.filter((e) => e.classId === id);
              return {
                id,
                name: items[0].className,
                code: items[0].classCode,
                hasOpen: items.some((e) => e.status === 'OPEN'),
                items,
              };
            })
            // Classes with an open exam first, then alphabetical.
            .sort(
              (a, b) =>
                Number(b.hasOpen) - Number(a.hasOpen) ||
                a.name.localeCompare(b.name),
            );

          return (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <div
                  role="group"
                  aria-label="Filter by status"
                  className="flex flex-wrap gap-1.5"
                >
                  {FILTERS.map((f) => {
                    const n = countOf(f.value);
                    const active = filter === f.value;
                    return (
                      <button
                        key={f.value}
                        type="button"
                        aria-pressed={active}
                        disabled={n === 0 && !active}
                        onClick={() => setFilter(f.value)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                          'disabled:cursor-not-allowed disabled:opacity-40',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'bg-card text-foreground hover:bg-accent',
                        )}
                      >
                        {f.label} ({n})
                      </button>
                    );
                  })}
                </div>

                <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  {courses.length > 1 && (
                    <select
                      aria-label="Filter by course"
                      value={classId}
                      onChange={(ev) => setClassId(ev.target.value)}
                      className="h-9 rounded-md border bg-card px-3 text-sm"
                    >
                      <option value="ALL">
                        All courses ({courses.length})
                      </option>
                      {courses.map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      aria-label="Search exams"
                      placeholder="Search exams"
                      value={query}
                      onChange={(ev) => setQuery(ev.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {groups.length === 0 ? (
                <EmptyState title="No exams match these filters" />
              ) : (
                groups.map((g) => (
                  <section key={g.id} className="mb-6">
                    <h2 className="mb-2 flex flex-wrap items-baseline gap-x-2 text-base font-semibold">
                      {g.name}
                      <span className="text-xs font-normal text-muted-foreground">
                        {g.code} · {g.items.length} exam
                        {g.items.length > 1 ? 's' : ''}
                      </span>
                    </h2>
                    <div className="overflow-hidden rounded-lg border bg-card">
                      {/* Column headers: said once here instead of in every row. */}
                      <div
                        aria-hidden="true"
                        className={cn(
                          'hidden border-b border-l-transparent bg-muted/40 py-2 text-xs font-medium text-muted-foreground sm:grid',
                          COLS,
                        )}
                      >
                        <span>Exam</span>
                        <span>Attempts</span>
                        <span>Best score</span>
                        <span />
                      </div>
                      <ul className="m-0 list-none divide-y p-0">
                        {g.items.map((e) => (
                          <ExamRow key={e.id} exam={e} />
                        ))}
                      </ul>
                    </div>
                  </section>
                ))
              )}
            </>
          );
        }}
      </AsyncView>
    </div>
  );
};

export default ExamsPage;