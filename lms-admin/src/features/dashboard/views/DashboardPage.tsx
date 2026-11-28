import { useState } from 'react';
import { Link } from 'react-router';
import {
  AuditDetailModal,
  getActionDotTone,
  getActionMeta,
  useAuditLogs,
  type AuditCategory,
  type AuditLogItem,
} from '@/features/audit';
import { AsyncView } from '@/shared/components/AsyncView';
import { EmptyState } from '@/shared/components/EmptyState';
import { buttonClasses } from '@/shared/components/ui/button-classes';
import { cn } from '@/shared/utils/cn';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/date';
import { AttentionPanel } from '../components/AttentionPanel';
import { HourlyActivityCard } from '../components/HourlyActivityCard';
import { StackedBar } from '../components/KpiCard';
import { Panel, Segmented } from '../components/Panel';
import { PresenceCard } from '../components/PresenceCard';
import { SemesterTimeline } from '../components/SemesterTimeline';
import { SubjectDistributionCard } from '../components/SubjectDistributionCard';
import { TrafficTrendCard } from '../components/TrafficTrendCard';
import {
  DASHBOARD_REFRESH_SECONDS,
  useDashboardOverview,
} from '../hooks/useDashboardStats';
import type { TrendDays } from '../types/dashboard.types';

type ActivityFilter = 'ALL' | AuditCategory;

const ACTIVITY_TABS: { value: ActivityFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SECURITY', label: 'Security' },
];

const formatClock = (timestamp: number): string =>
  timestamp
    ? new Date(timestamp).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const signedIn = (total: number, pending: number, inactive: number) =>
  Math.max(0, total - pending - inactive);

const DashboardPage = () => {
  const [trendDays, setTrendDays] = useState<TrendDays>(14);
  const overviewQuery = useDashboardOverview(trendDays);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('ALL');
  const recentLogs = useAuditLogs({
    page: 1,
    limit: 8,
    category: activityFilter === 'ALL' ? undefined : activityFilter,
  });
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const summary = overviewQuery.data;
  const subtitle = summary
    ? `${summary.classes.activeCount} active courses, ${summary.traffic.onlineNowCount} online now, Updated ${formatClock(overviewQuery.dataUpdatedAt)}, refreshes every ${DASHBOARD_REFRESH_SECONDS}s`
    : `Updated ${formatClock(overviewQuery.dataUpdatedAt)}, refreshes every ${DASHBOARD_REFRESH_SECONDS}s`;

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <h1 className="m-0 text-xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="m-0 mt-0.5 text-xs tabular-nums text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/courses"
            className="text-xs font-medium text-muted-foreground no-underline hover:text-brand hover:underline"
          >
            Courses
          </Link>
          <Link
            to="/audit-logs"
            className="text-xs font-medium text-muted-foreground no-underline hover:text-brand hover:underline"
          >
            Audit log
          </Link>
          <Link
            to="/import-export"
            className={buttonClasses(
              'primary',
              'sm',
              'rounded-[5px] shadow-none',
            )}
          >
            Import / Export
          </Link>
        </div>
      </header>

      <AsyncView
        state={{
          data: overviewQuery.data,
          loading: overviewQuery.isLoading,
          error: overviewQuery.error,
          reload: () => void overviewQuery.refetch(),
        }}
      >
        {(overview) => {
          const { classes, students, lecturers, activeSemester, traffic } =
            overview;
          return (
            <div className="space-y-6">
              {/* Row 1: Asymmetric 8:4 top strip — focal courses/term card + 2 flat personnel metrics | Needs attention */}
              <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
                <div className="flex flex-col gap-4 lg:col-span-8">
                  <div className="grid grid-cols-1 gap-4 rounded-[5px] border bg-card p-4 sm:grid-cols-12">
                    <div className="flex flex-col justify-between gap-3 sm:col-span-7">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] text-muted-foreground">
                          Active courses
                        </span>
                        <Link
                          to="/courses"
                          className="text-xs font-medium text-brand no-underline hover:underline"
                        >
                          All courses →
                        </Link>
                      </div>
                      <p className="m-0 text-2xl font-semibold leading-none tabular-nums">
                        {classes.activeCount}
                      </p>
                      <StackedBar
                        segments={[
                          {
                            label: 'this semester',
                            value: classes.currentSemesterCount,
                            tone: 'bg-brand',
                          },
                          {
                            label: 'other',
                            value: Math.max(
                              0,
                              classes.activeCount - classes.currentSemesterCount,
                            ),
                            tone: 'bg-muted-foreground/40',
                          },
                          {
                            label: 'ended',
                            value: classes.endedCount,
                            tone: 'bg-muted-foreground/20',
                          },
                        ]}
                      />
                    </div>

                    <div className="flex flex-col justify-between gap-3 border-t pt-3 sm:col-span-5 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] text-muted-foreground">
                          Current semester
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {activeSemester?.semesterCode ?? '—'}
                        </span>
                      </div>
                      {activeSemester ? (
                        <SemesterTimeline
                          semester={activeSemester}
                          nowMs={overviewQuery.dataUpdatedAt}
                        />
                      ) : (
                        <p className="m-0 text-xs text-muted-foreground">
                          No semester configured.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid flex-1 grid-cols-1 divide-y border-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    <div className="flex flex-col justify-between gap-2.5 py-3 sm:pr-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] text-muted-foreground">
                          Students
                        </span>
                        <div className="flex items-baseline gap-2.5">
                          <span className="text-lg font-semibold tabular-nums">
                            {students.totalCount}
                          </span>
                          <Link
                            to="/students"
                            className="text-xs font-medium text-brand no-underline hover:underline"
                          >
                            Manage
                          </Link>
                        </div>
                      </div>
                      <StackedBar
                        segments={[
                          {
                            label: 'active',
                            value: signedIn(
                              students.totalCount,
                              students.pendingCount,
                              students.inactiveCount,
                            ),
                            tone: 'bg-success',
                          },
                          {
                            label: 'not signed in',
                            value: students.pendingCount,
                            tone: 'bg-warning',
                            to: '/students',
                          },
                          {
                            label: 'inactive',
                            value: students.inactiveCount,
                            tone: 'bg-muted-foreground/40',
                          },
                        ]}
                      />
                    </div>

                    <div className="flex flex-col justify-between gap-2.5 py-3 sm:pl-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] text-muted-foreground">
                          Lecturers
                        </span>
                        <div className="flex items-baseline gap-2.5">
                          <span className="text-lg font-semibold tabular-nums">
                            {lecturers.totalCount}
                          </span>
                          <Link
                            to="/lecturers"
                            className="text-xs font-medium text-brand no-underline hover:underline"
                          >
                            Manage
                          </Link>
                        </div>
                      </div>
                      <StackedBar
                        segments={[
                          {
                            label: 'active',
                            value: signedIn(
                              lecturers.totalCount,
                              lecturers.pendingCount,
                              lecturers.inactiveCount,
                            ),
                            tone: 'bg-success',
                          },
                          {
                            label: 'not signed in',
                            value: lecturers.pendingCount,
                            tone: 'bg-warning',
                            to: '/lecturers',
                          },
                          {
                            label: 'inactive',
                            value: lecturers.inactiveCount,
                            tone: 'bg-muted-foreground/40',
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <AttentionPanel overview={overview} />
                </div>
              </div>

              {/* Row 2: Traffic trend (card) + Online users (flat) */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <TrafficTrendCard
                    traffic={traffic}
                    points={overview.trends.loginsByDay}
                    days={trendDays}
                    onDaysChange={setTrendDays}
                  />
                </div>
                <div className="lg:col-span-5">
                  <PresenceCard traffic={traffic} />
                </div>
              </div>

              {/* Row 3: Subject enrolment (card) + Hourly activity (flat) */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <SubjectDistributionCard
                    items={overview.subjectDistribution}
                  />
                </div>
                <div className="lg:col-span-5">
                  <HourlyActivityCard points={overview.trends.activityByHour} />
                </div>
              </div>
            </div>
          );
        }}
      </AsyncView>

      <div className="mt-6">
        <Panel
          variant="flat"
          title="Recent activity"
          aside={
            <div className="flex items-center gap-3">
              <Segmented
                label="Activity filter"
                value={activityFilter}
                options={ACTIVITY_TABS}
                onChange={setActivityFilter}
              />
              <Link
                to="/audit-logs"
                className="text-xs font-medium text-brand no-underline hover:underline"
              >
                All logs
              </Link>
            </div>
          }
        >
          <AsyncView
            state={{
              data: recentLogs.data?.items,
              loading: recentLogs.isLoading,
              error: recentLogs.error,
              reload: () => void recentLogs.refetch(),
            }}
            isEmpty={(rows) => rows.length === 0}
            empty={
              <EmptyState
                title="0 recent activity events"
                description="Administrative actions and sign-in events will appear here."
              />
            }
          >
            {(rows) => (
              <ul className="m-0 divide-y p-0">
                {rows.map((item) => {
                  const meta = getActionMeta(item.action);
                  return (
                    <li key={item.id} className="list-none">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(item)}
                        className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-[4px] border-0 bg-transparent px-2 py-2.5 text-left transition-colors hover:bg-muted/70"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'h-2 w-2 shrink-0 rounded-full',
                            getActionDotTone(item),
                          )}
                        />
                        <span className="w-36 shrink-0 truncate text-xs font-medium text-muted-foreground">
                          {meta.label}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px]">
                            {item.summary ?? item.entityLabel ?? meta.label}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.actorName ?? item.actorEmail ?? 'System'}
                            {item.ipAddress && (
                              <span className="ml-2 font-mono">
                                {item.ipAddress}
                              </span>
                            )}
                          </span>
                        </span>
                        <span
                          title={formatDateTime(item.occurredAt)}
                          className="shrink-0 text-xs tabular-nums text-muted-foreground"
                        >
                          {formatRelativeTime(item.occurredAt)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </AsyncView>
        </Panel>
      </div>

      <AuditDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </>
  );
};

export default DashboardPage;
