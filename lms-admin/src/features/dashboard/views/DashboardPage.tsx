import { useState } from 'react';
import { ArrowRight, BookOpen, FileSpreadsheet, ScrollText } from 'lucide-react';
import { Link } from 'react-router';
import {
  AuditDetailModal,
  getActionMeta,
  useAuditLogs,
  type AuditCategory,
  type AuditLogItem,
} from '@/features/audit';
import { useAdminSession } from '@/features/auth';
import { AsyncView } from '@/shared/components/AsyncView';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { buttonClasses } from '@/shared/components/ui/button-classes';
import { cn } from '@/shared/utils/cn';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/date';
import { AttentionPanel } from '../components/AttentionPanel';
import { HourlyActivityCard } from '../components/HourlyActivityCard';
import { KpiCard, StackedBar } from '../components/KpiCard';
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

const DOT_TONE: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};

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
  const { data: user } = useAdminSession();
  const [trendDays, setTrendDays] = useState<TrendDays>(14);
  const overviewQuery = useDashboardOverview(trendDays);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('ALL');
  const recentLogs = useAuditLogs({
    page: 1,
    limit: 8,
    category: activityFilter === 'ALL' ? undefined : activityFilter,
  });
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.fullName ?? 'Admin'} · Updated ${formatClock(overviewQuery.dataUpdatedAt)} · refreshes every ${DASHBOARD_REFRESH_SECONDS}s`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/courses" className={buttonClasses('ghost', 'sm')}>
              <BookOpen className="h-4 w-4" />
              Manage Courses
            </Link>
            <Link to="/audit-logs" className={buttonClasses('outline', 'sm')}>
              <ScrollText className="h-4 w-4" />
              Audit Log
            </Link>
            <Link to="/import" className={buttonClasses('primary', 'sm')}>
              <FileSpreadsheet className="h-4 w-4" />
              Import Data
            </Link>
          </div>
        }
      />

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
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-8">
                  <KpiCard
                    label="Active courses"
                    value={classes.activeCount}
                    to="/courses"
                  >
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
                          tone: 'bg-muted-foreground/15',
                        },
                      ]}
                    />
                  </KpiCard>

                  <KpiCard label="Students" value={students.totalCount} to="/students">
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
                  </KpiCard>

                  <KpiCard label="Lecturers" value={lecturers.totalCount} to="/lecturers">
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
                  </KpiCard>

                  <KpiCard
                    label="Current semester"
                    value={activeSemester?.semesterCode ?? '—'}
                  >
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
                  </KpiCard>
                </div>

                {/* On desktop the panel is absolutely sized so it matches the KPI grid height and scrolls if needed. */}
                <div className="relative lg:col-span-4">
                  <div className="lg:absolute lg:inset-0">
                    <AttentionPanel overview={overview} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
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

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <SubjectDistributionCard items={overview.subjectDistribution} />
                </div>
                <div className="lg:col-span-5">
                  <HourlyActivityCard points={overview.trends.activityByHour} />
                </div>
              </div>
            </div>
          );
        }}
      </AsyncView>

      <div className="mt-4">
        <Panel
          title="Recent activity"
          aside={
            <div className="flex items-center gap-2">
              <Segmented
                label="Activity filter"
                value={activityFilter}
                options={ACTIVITY_TABS}
                onChange={setActivityFilter}
              />
              <Link to="/audit-logs" className={buttonClasses('ghost', 'sm')}>
                View all
                <ArrowRight className="h-3.5 w-3.5" />
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
                title="No recent activity yet"
                description="Administrative actions and login events will appear here."
              />
            }
          >
            {(rows) => (
              <ul className="m-0 -my-1 divide-y p-0">
                {rows.map((item) => {
                  const meta = getActionMeta(item.action);
                  return (
                    <li key={item.id} className="list-none">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(item)}
                        className="flex w-full items-center gap-3 border-0 bg-transparent px-1 py-2.5 text-left transition-colors hover:bg-accent/40"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'h-2 w-2 shrink-0 rounded-full',
                            DOT_TONE[meta.variant] ?? 'bg-muted-foreground/50',
                          )}
                        />
                        <span className="w-36 shrink-0 truncate text-xs font-medium text-muted-foreground">
                          {meta.label}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {item.summary ?? item.entityLabel ?? meta.label}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.actorName ?? item.actorEmail ?? 'System'}
                            {item.ipAddress ? ` · ${item.ipAddress}` : ''}
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
