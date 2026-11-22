import { formatDateTime } from '@shared/utils/format';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { StatusBadge } from '@shared/components/ui/badge';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { useMyAssignments } from '../hooks/useAssignmentLists';
import type { Assignment, AssignmentStatus } from '../types/assignments.types';
import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarClock } from 'lucide-react';

const filters: (AssignmentStatus | 'ALL')[] = [
  'ALL',
  'OPEN',
  'UPCOMING',
  'SUBMITTED',
  'GRADED',
  'OVERDUE',
];

const ATTENTION: AssignmentStatus[] = ['OVERDUE', 'OPEN', 'UPCOMING'];


// Literal class names so Tailwind can see them.
const COURSE_DOTS = [
  'bg-blue-600', 'bg-violet-600', 'bg-teal-600',
  'bg-orange-600', 'bg-pink-600', 'bg-lime-600',
];
const dotOf = (classId: string) => {
  let hash = 0;
  for (const ch of classId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COURSE_DOTS[hash % COURSE_DOTS.length];
};

const courseLabel = (a: Assignment) =>
  a.classCode && a.className
    ? `${a.classCode} · ${a.className}`
    : (a.className ?? a.classCode ?? 'Unknown class');

const byDueAsc = (a: Assignment, b: Assignment) =>
  +new Date(a.endAt) - +new Date(b.endAt);

const AssignmentCard = ({ a }: { a: Assignment }) => (
  <li>
    <Link
      to={`/student/courses/${a.classId}/assignments/${a.id}`}
      className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 text-foreground no-underline hover:border-primary"
    >
      <div className="min-w-0 flex-1 basis-64">
        <p className="m-0 mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className={cn('h-2.5 w-2.5 rounded-full', dotOf(a.classId))} />
          {courseLabel(a)}
        </p>
        <p className="m-0 font-semibold">{a.title}</p>
        <p className="m-0 mt-1 truncate text-sm text-muted-foreground">
          {a.instruction}
        </p>
      </div>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarClock className="h-4 w-4" />
        Due {formatDateTime(a.endAt)}
      </span>
      <StatusBadge status={a.status} />
    </Link>
  </li>
);

const Section = ({ title, items }: { title: string; items: Assignment[] }) =>
  items.length === 0 ? null : (
    <section className="space-y-3">
      <h2 className="m-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <ul className="m-0 list-none space-y-3 p-0">
        {items.map((a) => (
          <AssignmentCard key={a.id} a={a} />
        ))}
      </ul>
    </section>
  );

const AssignmentsPage = () => {
  const state = toAsyncState(useMyAssignments());
  const [filter, setFilter] = useState<(typeof filters)[number]>('ALL');
  const [classId, setClassId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title="Assignments" />
      <AsyncView
        state={state}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            title="No assignments"
            description="You have no assignments yet."
          />
        }
      >
        {(all) => {
          const count = (s: AssignmentStatus) =>
            all.filter((a) => a.status === s).length;

          // Courses, derived from the assignments themselves.
          const courses = [
            ...new Map(all.map((a) => [a.classId, a])).values(),
          ].map((a) => ({
            id: a.classId,
            label: courseLabel(a),
            total: all.filter((x) => x.classId === a.classId).length,
          }));

          const visible = all.filter(
            (a) =>
              (filter === 'ALL' || a.status === filter) &&
              (classId === null || a.classId === classId),
          );
          const attention = visible
            .filter((a) => ATTENTION.includes(a.status))
            .sort(byDueAsc);
          const done = visible
            .filter((a) => !ATTENTION.includes(a.status))
            .sort((a, b) => byDueAsc(b, a));

          return (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ['Overdue', count('OVERDUE'), 'text-red-700'],
                  ['Open', count('OPEN'), 'text-amber-700'],
                  ['Submitted', count('SUBMITTED'), 'text-blue-700'],
                  ['Graded', count('GRADED'), 'text-green-700'],
                ].map(([label, n, color]) => (
                  <div key={label as string} className="rounded-xl border bg-card p-4">
                    <p className={cn('m-0 text-3xl font-bold', color as string)}>{n}</p>
                    <p className="m-0 text-sm text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {filters.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm font-medium',
                      filter === f
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-card',
                    )}
                  >
                    {f === 'ALL' ? `All · ${all.length}` : `${f.charAt(0) + f.slice(1).toLowerCase()} · ${count(f)}`}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-start gap-6">
                <div className="min-w-0 flex-1 basis-96 space-y-6">
                  {visible.length === 0 ? (
                    <EmptyState title="No assignments match this filter" />
                  ) : (
                    <>
                      <Section title="Needs attention" items={attention} />
                      <Section title="Submitted & graded" items={done} />
                    </>
                  )}
                </div>

                <aside className="w-full rounded-xl border bg-card p-3 lg:w-72">
                  <p className="m-0 px-3 py-2 font-semibold">Filter by course</p>
                  {[{ id: null, label: 'All courses', total: all.length }, ...courses].map((c) => (
                    <button
                      key={c.id ?? 'all'}
                      type="button"
                      onClick={() => setClassId(c.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm',
                        classId === c.id ? 'bg-primary/10' : 'hover:bg-muted',
                      )}
                    >
                      {c.id && <span className={cn('h-2.5 w-2.5 rounded-full', dotOf(c.id))} />}
                      <span className="min-w-0 flex-1 truncate">{c.label}</span>
                      <b>{c.total}</b>
                    </button>
                  ))}
                </aside>
              </div>
            </div>
          );
        }}
      </AsyncView>
    </div>
  );
};

export default AssignmentsPage;