import { useState } from 'react';
import { Link } from 'react-router';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/utils/cn';
import { toAsyncState } from '@shared/utils/async-state';
import { formatDate, formatDateTime } from '@shared/utils/format';
import { LecturerScoreDistributionCard } from '../components/LecturerScoreDistributionCard';
import { LecturerSubmissionTrendCard } from '../components/LecturerSubmissionTrendCard';
import {
  LECTURER_DASHBOARD_REFRESH_SECONDS,
  useLecturerDashboard,
} from '../hooks/useLecturerDashboard';
import type { LecturerTrendDays } from '../types/lecturer-dashboard.types';
import {
  buildLecturerAttentionChecks,
  formatRelativeAge,
  type AttentionSeverity,
} from '../utils/lecturer-dashboard.utils';

type QueueFilter = 'ALL' | 'exam' | 'assignment';

const QUEUE_TABS: { value: QueueFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'exam', label: 'Exams' },
  { value: 'assignment', label: 'Assignments' },
];

const SEVERITY_DOT: Record<AttentionSeverity, string> = {
  error: 'bg-destructive',
  warning: 'bg-warning',
  ok: 'bg-success',
};

const formatClock = (timestamp: number): string =>
  timestamp
    ? new Date(timestamp).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const LecturerDashboard = () => {
  const [trendDays, setTrendDays] = useState<LecturerTrendDays>(14);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('ALL');
  const [mountNow] = useState(() => Date.now());
  const overviewQuery = useLecturerDashboard(trendDays);
  const state = toAsyncState(overviewQuery);
  const nowMs =
    overviewQuery.dataUpdatedAt > 0 ? overviewQuery.dataUpdatedAt : mountNow;

  return (
    <div className="space-y-6">
      <AsyncView
        state={state}
        isEmpty={(d) =>
          d.summary.activeClassCount === 0 && d.summary.endedClassCount === 0
        }
        empty={
          <EmptyState
            title="0 classes assigned"
            description="No active classes are assigned to your account this semester."
          />
        }
      >
        {(overview) => {
          const {
            summary,
            trends,
            upcomingEvents,
            classes,
            gradingQueue,
            scoreDistribution,
            atRiskStudents,
          } = overview;
          const attentionChecks = buildLecturerAttentionChecks(overview);
          const issueCount = attentionChecks.filter(
            (c) => c.severity !== 'ok',
          ).length;

          const queueSegments = [
            {
              label: 'exams',
              value: summary.pendingExamsCount,
              tone: 'bg-warning',
            },
            {
              label: 'assignments',
              value: summary.pendingAssignmentsCount,
              tone: 'bg-brand',
            },
          ].filter((s) => s.value > 0);

          const filteredQueue = gradingQueue.filter(
            (item) => queueFilter === 'ALL' || item.kind === queueFilter,
          );

          return (
            <div className="space-y-6">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div>
                  <h1 className="m-0 text-xl font-semibold tracking-tight">
                    Dashboard
                  </h1>
                  <p className="m-0 mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {summary.activeClassCount} active classes,{' '}
                    {summary.totalStudents} students, Updated{' '}
                    {formatClock(overviewQuery.dataUpdatedAt)}, refreshes every{' '}
                    {LECTURER_DASHBOARD_REFRESH_SECONDS}s
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-[5px] shadow-none"
                >
                  <Link to="/lecturer/ai-generator" className="no-underline">
                    Generate assessment
                  </Link>
                </Button>
              </header>

              {/* Row 1: Asymmetric 8:4 top strip (KPI left, height-matched Needs Attention right) */}
              <section className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
                <div className="flex flex-col gap-4 lg:col-span-8">
                  <div className="flex flex-col justify-between gap-3 rounded-[5px] border bg-card p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[13px] text-muted-foreground">
                        Submissions awaiting grade
                      </span>
                      <Link
                        to="/lecturer/grading"
                        className="text-xs font-medium text-brand no-underline hover:underline"
                      >
                        Open grading desk →
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="text-2xl font-semibold leading-none tabular-nums">
                        {summary.pendingGradingCount}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {summary.pendingGradingCount > 0
                          ? `oldest waiting ${formatRelativeAge(summary.oldestPendingSubmittedAt, nowMs)}`
                          : '0 items waiting'}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-muted">
                        {queueSegments.map((seg) => (
                          <div
                            key={seg.label}
                            style={{
                              width: `${(seg.value / Math.max(1, summary.pendingGradingCount)) * 100}%`,
                            }}
                            className={seg.tone}
                          />
                        ))}
                      </div>
                      {queueSegments.length > 0 && (
                        <ul className="m-0 flex flex-wrap gap-x-3 gap-y-1 p-0 text-xs text-muted-foreground">
                          {queueSegments.map((seg) => (
                            <li
                              key={seg.label}
                              className="flex list-none items-center gap-1.5"
                            >
                              <span
                                className={cn(
                                  'h-2 w-2 rounded-[2px]',
                                  seg.tone,
                                )}
                              />
                              <span className="tabular-nums text-foreground">
                                {seg.value}
                              </span>
                              {seg.label}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    <div className="flex flex-col justify-between gap-1.5 py-3 sm:pr-4">
                      <span className="text-[13px] text-muted-foreground">
                        Teaching load
                      </span>
                      <span className="text-lg font-semibold tabular-nums">
                        {summary.activeClassCount} active classes
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {summary.activeStudents7dCount} of{' '}
                        {summary.totalStudents} students active (7d)
                      </span>
                    </div>

                    <div className="flex flex-col justify-between gap-1.5 py-3 sm:px-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] text-muted-foreground">
                          Submission rate
                        </span>
                        <span className="text-lg font-semibold tabular-nums">
                          {summary.submissionRatePercent}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${summary.submissionRatePercent}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {summary.submittedCount} of{' '}
                        {summary.expectedSubmissionCount} expected
                      </span>
                    </div>

                    <div className="flex flex-col justify-between gap-1.5 py-3 sm:pl-4">
                      <span className="text-[13px] text-muted-foreground">
                        Next 7 days
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-semibold tabular-nums">
                          {summary.upcoming7dCount} events
                        </span>
                        {summary.liveExamsCount > 0 && (
                          <span className="text-xs font-medium text-warning">
                            {summary.liveExamsCount} live
                          </span>
                        )}
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {summary.upcomingExams7dCount} exams,{' '}
                        {summary.upcomingAssignments7dCount} deadlines
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <section className="flex h-full min-w-0 flex-col rounded-[5px] border bg-card">
                    <header className="flex min-h-[45px] items-center justify-between gap-2 border-b px-4 py-2.5">
                      <h2 className="m-0 text-sm font-semibold">
                        Needs attention
                      </h2>
                      <span
                        className={cn(
                          'text-xs tabular-nums',
                          issueCount > 0 ? 'text-foreground' : 'text-success',
                        )}
                      >
                        {issueCount > 0
                          ? `${issueCount} ${issueCount === 1 ? 'item' : 'items'}`
                          : '0 issues'}
                      </span>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4">
                      <ul className="m-0 -my-2 divide-y p-0">
                        {attentionChecks.map((check) => (
                          <li
                            key={check.key}
                            className="flex list-none flex-wrap items-center gap-x-2.5 gap-y-1.5 py-2.5"
                          >
                            <span
                              aria-label={check.severity}
                              className={cn(
                                'h-2 w-2 shrink-0 rounded-full',
                                SEVERITY_DOT[check.severity],
                              )}
                            />
                            <span
                              className={cn(
                                'min-w-0 flex-1 text-[13px]',
                                check.severity === 'ok' &&
                                  'text-muted-foreground',
                              )}
                            >
                              {check.text}
                            </span>
                            {check.links && check.links.length > 0 && (
                              <span className="flex flex-wrap items-center gap-1">
                                {check.links.map((link) => (
                                  <Link
                                    key={link.to}
                                    to={link.to}
                                    className="rounded-[4px] border px-1.5 py-0.5 font-mono text-xs text-foreground no-underline hover:border-brand hover:text-brand"
                                  >
                                    {link.label}
                                  </Link>
                                ))}
                                {check.moreCount ? (
                                  <span className="rounded-[4px] border bg-muted/50 px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                                    +{check.moreCount}
                                  </span>
                                ) : null}
                              </span>
                            )}
                            {check.to && check.action && (
                              <Link
                                to={check.to}
                                className="shrink-0 text-xs font-medium text-brand no-underline hover:underline"
                              >
                                {check.action}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                </div>
              </section>

              {/* Row 2: Submissions vs graded trend (7 col) + Upcoming schedule (5 col, flat) */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <LecturerSubmissionTrendCard
                    points={trends.submissionsByDay}
                    days={trendDays}
                    onDaysChange={setTrendDays}
                  />
                </div>
                <section className="lg:col-span-5">
                  <header className="flex min-h-[45px] items-center justify-between gap-2 border-b pb-2.5">
                    <h2 className="m-0 text-sm font-semibold">
                      Upcoming 7 days
                    </h2>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {upcomingEvents.length} scheduled
                    </span>
                  </header>
                  {upcomingEvents.length === 0 ? (
                    <p className="m-0 py-6 text-[13px] text-muted-foreground">
                      0 exams or assignment deadlines in the next 7 days.
                    </p>
                  ) : (
                    <ul className="m-0 divide-y p-0">
                      {upcomingEvents.map((ev) => {
                        const targetUrl =
                          ev.kind === 'exam'
                            ? `/lecturer/classes/${ev.classId}/exams/${ev.sourceId}`
                            : `/lecturer/classes/${ev.classId}/assignments/${ev.sourceId}`;
                        return (
                          <li key={ev.id} className="list-none py-0.5">
                            <Link
                              to={targetUrl}
                              className="-mx-2 flex items-center justify-between gap-3 rounded-[4px] px-2 py-2 text-[13px] text-foreground no-underline transition-colors hover:bg-muted/70"
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span
                                  aria-label={ev.kind}
                                  className={cn(
                                    'h-2 w-2 shrink-0 rounded-full',
                                    ev.isLive && ev.kind === 'exam'
                                      ? 'bg-warning'
                                      : ev.kind === 'exam'
                                        ? 'bg-warning/70'
                                        : 'bg-brand',
                                  )}
                                />
                                <div className="min-w-0">
                                  <span className="block truncate font-medium">
                                    {ev.title}
                                  </span>
                                  <p className="m-0 truncate text-xs text-muted-foreground">
                                    <span className="font-mono">
                                      {ev.classCode}
                                    </span>
                                    {ev.kind === 'exam'
                                      ? ev.durationMinutes
                                        ? `, Exam (${ev.durationMinutes}m)`
                                        : ', Exam'
                                      : ', Assignment'}
                                  </p>
                                </div>
                              </div>
                              <div className="shrink-0 text-right text-xs tabular-nums">
                                <span
                                  className={cn(
                                    'block font-medium',
                                    ev.isLive && ev.kind === 'exam'
                                      ? 'text-warning'
                                      : 'text-foreground',
                                  )}
                                >
                                  {ev.isLive && ev.kind === 'exam'
                                    ? 'Live now'
                                    : formatDateTime(
                                        ev.kind === 'exam'
                                          ? ev.startAt
                                          : ev.endAt,
                                      )}
                                </span>
                                <span className="text-muted-foreground">
                                  {ev.submittedCount}/{ev.studentCount}{' '}
                                  {ev.kind === 'exam' ? 'started' : 'submitted'}
                                </span>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>

              {/* Row 3: Active classes health table (7 col, bordered) + Grading queue (5 col, flat) */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <section className="flex flex-col rounded-[5px] border bg-card lg:col-span-7">
                  <header className="flex min-h-[45px] items-center justify-between gap-2 border-b px-4 py-2.5">
                    <h2 className="m-0 text-sm font-semibold">
                      Active classes ({classes.length})
                    </h2>
                    <Link
                      to="/lecturer/classes"
                      className="text-xs font-medium text-brand no-underline hover:underline"
                    >
                      All classes
                    </Link>
                  </header>
                  <ul className="m-0 divide-y p-0">
                    {classes.map((c) => (
                      <li
                        key={c.id}
                        className="flex list-none flex-wrap items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              {c.classCode}
                            </span>
                            <Link
                              to={`/lecturer/classes/${c.id}`}
                              className="truncate text-[13px] font-medium text-foreground no-underline hover:text-brand hover:underline"
                            >
                              {c.name}
                            </Link>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs tabular-nums text-muted-foreground">
                            <span>
                              {c.studentCount} students ({c.activeStudents7dCount}{' '}
                              active 7d)
                            </span>
                            <span>
                              Avg{' '}
                              {c.avgScore !== null
                                ? c.avgScore.toFixed(1)
                                : '—'}
                            </span>
                            {c.pendingGradingCount > 0 ? (
                              <span className="font-medium text-warning">
                                {c.pendingGradingCount} ungraded
                              </span>
                            ) : (
                              <span>0 ungraded</span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <div className="w-24 text-right">
                            <span className="block text-xs font-medium tabular-nums">
                              {c.completionRatePercent}% done
                            </span>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-brand"
                                style={{
                                  width: `${c.completionRatePercent}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Link
                              to={`/lecturer/classes/${c.id}/grades`}
                              className="text-muted-foreground no-underline hover:text-brand hover:underline"
                            >
                              Grades
                            </Link>
                            <Link
                              to={`/lecturer/classes/${c.id}/members`}
                              className="text-muted-foreground no-underline hover:text-brand hover:underline"
                            >
                              Members
                            </Link>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="lg:col-span-5">
                  <header className="flex min-h-[45px] flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                    <h2 className="m-0 text-sm font-semibold">Grading queue</h2>
                    <div
                      role="group"
                      aria-label="Filter grading queue"
                      className="inline-flex rounded-[4px] border bg-muted/50 p-0.5"
                    >
                      {QUEUE_TABS.map((tab) => (
                        <button
                          key={tab.value}
                          type="button"
                          aria-pressed={queueFilter === tab.value}
                          onClick={() => setQueueFilter(tab.value)}
                          className={cn(
                            'rounded-[3px] border-0 px-2 py-0.5 text-xs font-medium transition-colors',
                            queueFilter === tab.value
                              ? 'bg-card text-foreground'
                              : 'bg-transparent text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </header>
                  {filteredQueue.length === 0 ? (
                    <p className="m-0 py-6 text-[13px] text-muted-foreground">
                      0 ungraded items matching this filter.
                    </p>
                  ) : (
                    <ul className="m-0 divide-y p-0">
                      {filteredQueue.slice(0, 7).map((item) => (
                        <li key={item.queueId} className="list-none py-0.5">
                          <Link
                            to={`/lecturer/grading?type=${item.kind}`}
                            className="-mx-2 flex items-baseline justify-between gap-3 rounded-[4px] px-2 py-2 text-[13px] text-foreground no-underline transition-colors hover:bg-muted/70"
                          >
                            <div className="flex min-w-0 items-baseline gap-2">
                              <span
                                aria-label={item.kind}
                                className={cn(
                                  'h-2 w-2 shrink-0 rounded-full',
                                  item.kind === 'exam'
                                    ? 'bg-warning'
                                    : 'bg-brand',
                                )}
                              />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-baseline gap-1.5">
                                  <span className="truncate font-medium">
                                    {item.studentName}
                                  </span>
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {item.studentCode}
                                  </span>
                                </div>
                                <p className="m-0 mt-0.5 truncate text-xs text-muted-foreground">
                                  {item.title},{' '}
                                  <span className="font-mono">
                                    {item.classCode}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <span
                              title={formatDate(item.submittedAt)}
                              className="shrink-0 text-xs tabular-nums text-muted-foreground"
                            >
                              {formatRelativeAge(item.submittedAt, nowMs)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              {/* Row 4: Score distribution histogram (7 col, bordered) + Students needing attention (5 col, flat) */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <LecturerScoreDistributionCard
                    distribution={scoreDistribution}
                    classes={classes}
                  />
                </div>
                <section className="lg:col-span-5">
                  <header className="flex min-h-[45px] items-center justify-between gap-2 border-b pb-2.5">
                    <h2 className="m-0 text-sm font-semibold">
                      Students needing attention
                    </h2>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {atRiskStudents.length} flagged
                    </span>
                  </header>
                  {atRiskStudents.length === 0 ? (
                    <p className="m-0 py-6 text-[13px] text-muted-foreground">
                      0 students flagged for missed work, low scores, or
                      inactivity.
                    </p>
                  ) : (
                    <ul className="m-0 divide-y p-0">
                      {atRiskStudents.map((st) => {
                        const reasons: string[] = [];
                        if (st.missedAssignmentsCount >= 2) {
                          reasons.push(`${st.missedAssignmentsCount} missed`);
                        }
                        if (st.avgScore !== null && st.avgScore < 5) {
                          reasons.push(`avg ${st.avgScore.toFixed(1)}`);
                        }
                        if (st.daysInactive !== null && st.daysInactive > 7) {
                          reasons.push(`inactive ${st.daysInactive}d`);
                        }
                        return (
                          <li
                            key={`${st.classId}:${st.studentId}`}
                            className="list-none py-0.5"
                          >
                            <Link
                              to={`/lecturer/classes/${st.classId}/grades`}
                              className="-mx-2 flex items-baseline justify-between gap-3 rounded-[4px] px-2 py-2 text-[13px] text-foreground no-underline transition-colors hover:bg-muted/70"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-baseline gap-1.5">
                                  <span className="truncate font-medium">
                                    {st.fullName}
                                  </span>
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {st.studentCode}
                                  </span>
                                </div>
                                <p className="m-0 mt-0.5 truncate text-xs text-muted-foreground">
                                  <span className="font-mono">
                                    {st.classCode}
                                  </span>
                                  , {st.className}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  'shrink-0 text-right text-xs font-medium tabular-nums',
                                  st.avgScore !== null && st.avgScore < 5
                                    ? 'text-destructive'
                                    : 'text-warning',
                                )}
                              >
                                {reasons.join(', ') || 'Needs review'}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          );
        }}
      </AsyncView>
    </div>
  );
};

export default LecturerDashboard;
