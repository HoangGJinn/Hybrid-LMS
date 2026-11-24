import { useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { AsyncView } from '@/shared/components/AsyncView';
import { EmptyState } from '@/shared/components/EmptyState';
import { Button } from '@/shared/components/ui/Button';
import { Segmented } from '@/shared/components/ui/Segmented';
import { cn } from '@/shared/utils/cn';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/date';
import { ResourceMeter } from '../components/ResourceMeter';
import { TrafficThroughputChart } from '../components/TrafficThroughputChart';
import { useSystemMonitoring } from '../hooks/useSystemMonitoring';
import type {
  EndpointMetricItem,
  EndpointSortBy,
  MemorySource,
  OverallHealthStatus,
  RefreshInterval,
  RuntimeMode,
  ServiceStatus,
} from '../types/monitoring.types';
import {
  formatBytes,
  formatDurationUptime,
  getUsageTone,
} from '../utils/format-bytes';

const REFRESH_OPTIONS: { value: RefreshInterval; label: string }[] = [
  { value: 5000, label: 'Live 5s' },
  { value: 15000, label: '15s' },
  { value: 0, label: 'Paused' },
];

const SORT_OPTIONS: { value: EndpointSortBy; label: string }[] = [
  { value: 'p95', label: 'Slowest (p95)' },
  { value: 'errors', label: 'Errors' },
  { value: 'requests', label: 'Traffic' },
];

const OVERALL_META: Record<
  OverallHealthStatus,
  { label: string; dot: string; badge: string }
> = {
  HEALTHY: {
    label: 'Healthy',
    dot: 'bg-success',
    badge: 'border-success/30 bg-success/10 text-success',
  },
  DEGRADED: {
    label: 'Degraded',
    dot: 'bg-warning',
    badge: 'border-warning/30 bg-warning/10 text-warning',
  },
  CRITICAL: {
    label: 'Critical',
    dot: 'bg-destructive',
    badge: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
};

const SERVICE_META: Record<
  ServiceStatus,
  { label: string; dot: string; text: string }
> = {
  UP: { label: 'Up', dot: 'bg-success', text: 'text-success' },
  DEGRADED: { label: 'Degraded', dot: 'bg-warning', text: 'text-warning' },
  DOWN: { label: 'Down', dot: 'bg-destructive', text: 'text-destructive' },
  UNCONFIGURED: {
    label: 'Unconfigured',
    dot: 'bg-muted-foreground/50',
    text: 'text-muted-foreground',
  },
};

const RUNTIME_LABELS: Record<RuntimeMode, string> = {
  DOCKER: 'Docker container',
  LINUX_HOST: 'Linux host',
  LOCAL_OS: 'Local OS',
};

const MEMORY_SOURCE_LABELS: Record<MemorySource, string> = {
  'cgroup-v2': 'Container RAM (cgroup v2)',
  'cgroup-v1': 'Container RAM (cgroup v1)',
  'proc-meminfo': 'Linux host RAM (MemAvailable)',
  'os-freemem': 'System RAM',
};

const formatClock = (iso: string | undefined): string => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
};

const sortEndpoints = (
  items: EndpointMetricItem[],
  sortBy: EndpointSortBy,
): EndpointMetricItem[] => {
  const copy = [...items];
  if (sortBy === 'errors') {
    return copy.sort(
      (a, b) =>
        b.errors5xx - a.errors5xx ||
        b.errors4xx - a.errors4xx ||
        b.p95LatencyMs - a.p95LatencyMs,
    );
  }
  if (sortBy === 'requests') {
    return copy.sort((a, b) => b.requests - a.requests);
  }
  return copy.sort((a, b) => b.p95LatencyMs - a.p95LatencyMs);
};

const MonitoringPage = () => {
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(15000);
  const [endpointSort, setEndpointSort] = useState<EndpointSortBy>('p95');
  const monitoring = useSystemMonitoring(refreshInterval);

  const overview = monitoring.data;
  const overall = overview ? OVERALL_META[overview.status] : null;
  const isRefreshing =
    monitoring.isForceRefreshing ||
    (monitoring.isFetching && !monitoring.isLoading);

  const runtimeSubtitle = overview
    ? `${RUNTIME_LABELS[overview.runtime.runtimeMode]}${overview.runtime.cgroupVersion ? ` (${overview.runtime.cgroupVersion})` : ''}, ${overview.runtime.platform}/${overview.runtime.arch}, Node ${overview.runtime.nodeVersion}, Host ${overview.runtime.hostname}, Uptime ${formatDurationUptime(overview.runtime.processUptimeSeconds)}, Updated ${formatClock(overview.generatedAt)}`
    : 'Container, server resources, dependencies, and HTTP load';

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="m-0 text-xl font-semibold tracking-tight">
              System monitoring
            </h1>
            {overall && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-xs font-medium',
                  overall.badge,
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn('h-1.5 w-1.5 rounded-full', overall.dot)}
                />
                {overall.label}
              </span>
            )}
          </div>
          <p className="m-0 mt-0.5 truncate text-xs tabular-nums text-muted-foreground">
            {runtimeSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Auto-refresh interval"
            value={refreshInterval}
            options={REFRESH_OPTIONS}
            onChange={setRefreshInterval}
          />
          <Button
            variant="outline"
            size="sm"
            className="rounded-[5px] shadow-none"
            disabled={isRefreshing}
            onClick={() => void monitoring.forceRefresh()}
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </header>

      <AsyncView
        state={{
          data: monitoring.data,
          loading: monitoring.isLoading,
          error: monitoring.error,
          reload: () => void monitoring.forceRefresh(),
        }}
      >
        {(data) => {
          const {
            alerts,
            runtime,
            dependencies,
            cpu,
            memory,
            storage,
            traffic,
          } = data;

          const dbPoolUsed =
            dependencies.database.activeConnections +
            dependencies.database.idleConnections;
          const dbPoolPercent =
            dependencies.database.maxConnections > 0
              ? Math.min(
                  100,
                  Math.round(
                    (dbPoolUsed / dependencies.database.maxConnections) * 1000,
                  ) / 10,
                )
              : 0;

          const sortedEndpoints = sortEndpoints(
            traffic.topEndpoints,
            endpointSort,
          ).slice(0, 10);

          const apiMeta = SERVICE_META[dependencies.api.status];
          const dbMeta = SERVICE_META[dependencies.database.status];
          const s3Meta = SERVICE_META[dependencies.s3.status];
          const integrationsUp =
            dependencies.integrations.googleOAuthConfigured &&
            dependencies.integrations.zaloBotConfigured;

          return (
            <div className="space-y-6">
              {alerts.length > 0 && (
                <section
                  aria-label="Active operational alerts"
                  className="rounded-[5px] border border-warning/40 bg-warning/[0.06] px-4 py-3"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                    />
                    <ul className="m-0 space-y-1 p-0 text-xs text-foreground">
                      {alerts.map((alert) => (
                        <li
                          key={alert.key}
                          className="flex items-center gap-2 list-none"
                        >
                          <span
                            className={cn(
                              'rounded-[3px] px-1.5 py-0 text-[11px] font-medium',
                              alert.severity === 'critical'
                                ? 'bg-destructive/15 text-destructive'
                                : 'bg-warning/20 text-warning',
                            )}
                          >
                            {alert.severity === 'critical'
                              ? 'Critical'
                              : 'Warning'}
                          </span>
                          <span>{alert.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {/* Row 1: Dependency Health Strip */}
              <section
                aria-label="Dependency health"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div className="rounded-[5px] border bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">API runtime</span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 font-medium',
                        apiMeta.text,
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn('h-1.5 w-1.5 rounded-full', apiMeta.dot)}
                      />
                      {apiMeta.label}
                    </span>
                  </div>
                  <p className="m-0 mt-1.5 font-mono text-base font-semibold tabular-nums">
                    {dependencies.api.eventLoopP95Ms} ms{' '}
                    <span className="font-sans text-xs font-normal text-muted-foreground">
                      loop p95
                    </span>
                  </p>
                  <p className="m-0 mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {dependencies.api.inFlightRequests} active in-flight, PID{' '}
                    {runtime.pid}
                  </p>
                </div>

                <div className="rounded-[5px] border bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">PostgreSQL</span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 font-medium',
                        dbMeta.text,
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn('h-1.5 w-1.5 rounded-full', dbMeta.dot)}
                      />
                      {dbMeta.label}
                    </span>
                  </div>
                  <p className="m-0 mt-1.5 font-mono text-base font-semibold tabular-nums">
                    {dependencies.database.latencyMs} ms{' '}
                    <span className="font-sans text-xs font-normal text-muted-foreground">
                      query ping
                    </span>
                  </p>
                  <p className="m-0 mt-0.5 truncate text-[11px] tabular-nums text-muted-foreground">
                    {dependencies.database.detail ??
                      `${dependencies.database.activeConnections} active, ${dependencies.database.idleConnections} idle / ${dependencies.database.maxConnections} max`}
                  </p>
                </div>

                <div className="rounded-[5px] border bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">AWS S3 storage</span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 font-medium',
                        s3Meta.text,
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn('h-1.5 w-1.5 rounded-full', s3Meta.dot)}
                      />
                      {s3Meta.label}
                    </span>
                  </div>
                  <p className="m-0 mt-1.5 font-mono text-base font-semibold tabular-nums">
                    {dependencies.s3.latencyMs} ms{' '}
                    <span className="font-sans text-xs font-normal text-muted-foreground">
                      {dependencies.s3.region}
                    </span>
                  </p>
                  <p
                    title={dependencies.s3.detail}
                    className="m-0 mt-0.5 truncate font-mono text-[11px] text-muted-foreground"
                  >
                    {dependencies.s3.bucket}
                  </p>
                </div>

                <div className="rounded-[5px] border bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Integrations</span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 font-medium',
                        integrationsUp
                          ? 'text-success'
                          : 'text-muted-foreground',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          integrationsUp
                            ? 'bg-success'
                            : 'bg-muted-foreground/60',
                        )}
                      />
                      {integrationsUp ? 'Configured' : 'Partial'}
                    </span>
                  </div>
                  <p className="m-0 mt-1.5 text-sm font-semibold text-foreground">
                    Google OAuth:{' '}
                    <span
                      className={
                        dependencies.integrations.googleOAuthConfigured
                          ? 'text-success'
                          : 'text-destructive'
                      }
                    >
                      {dependencies.integrations.googleOAuthConfigured
                        ? 'Ready'
                        : 'Missing'}
                    </span>
                  </p>
                  <p className="m-0 mt-0.5 text-[11px] text-muted-foreground">
                    Zalo Bot:{' '}
                    {dependencies.integrations.zaloBotConfigured
                      ? 'Token configured'
                      : 'Not configured'}
                  </p>
                </div>
              </section>

              {/* Row 2: Compute + Memory & Storage */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                <section className="flex flex-col rounded-[5px] border bg-card lg:col-span-6">
                  <header className="flex min-h-[45px] items-center justify-between gap-2 border-b px-4 py-2.5">
                    <h2 className="m-0 text-sm font-semibold">
                      Compute & event loop
                    </h2>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {cpu.quotaCores
                        ? `${cpu.quotaCores} vCPU quota (${cpu.hostCores} host)`
                        : `${cpu.hostCores} vCPU`}
                    </span>
                  </header>
                  <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                    <div className="space-y-4">
                      <ResourceMeter
                        label={
                          runtime.runtimeMode === 'DOCKER'
                            ? 'Container CPU utilization'
                            : 'System CPU utilization'
                        }
                        valueText={`${cpu.usagePercent.toFixed(1)}%`}
                        percent={cpu.usagePercent}
                        warnAt={85}
                        critAt={95}
                      />
                      <ResourceMeter
                        label="Node.js backend process CPU"
                        valueText={`${cpu.processPercent.toFixed(1)}%`}
                        percent={cpu.processPercent}
                        warnAt={85}
                        critAt={95}
                      />
                    </div>

                    <dl className="m-0 grid grid-cols-3 gap-3 border-t pt-3 text-xs">
                      <div>
                        <dt className="text-muted-foreground">
                          Load avg (1/5/15m)
                        </dt>
                        <dd className="m-0 mt-1 font-mono font-medium tabular-nums text-foreground">
                          {cpu.loadAvg
                            ? `${cpu.loadAvg[0]} / ${cpu.loadAvg[1]} / ${cpu.loadAvg[2]}`
                            : 'Linux host only'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          Event loop lag
                        </dt>
                        <dd className="m-0 mt-1 font-mono font-medium tabular-nums text-foreground">
                          {cpu.eventLoopMeanMs} / {cpu.eventLoopP95Ms} ms
                        </dd>
                        <span className="block text-[11px] text-muted-foreground">
                          max {cpu.eventLoopMaxMs} ms
                        </span>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          CPU throttling
                        </dt>
                        <dd className="m-0 mt-1 font-mono font-medium tabular-nums text-foreground">
                          {cpu.throttledPercent !== null
                            ? `${cpu.throttledPercent}%`
                            : 'None / N/A'}
                        </dd>
                        {cpu.throttledCount !== null && (
                          <span className="block text-[11px] tabular-nums text-muted-foreground">
                            {cpu.throttledCount.toLocaleString('en-US')} total
                            periods
                          </span>
                        )}
                      </div>
                    </dl>
                  </div>
                </section>

                <section className="flex flex-col rounded-[5px] border bg-card lg:col-span-6">
                  <header className="flex min-h-[45px] items-center justify-between gap-2 border-b px-4 py-2.5">
                    <h2 className="m-0 text-sm font-semibold">
                      Memory & storage
                    </h2>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      RSS {formatBytes(memory.rssBytes)}
                    </span>
                  </header>
                  <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                    <div className="space-y-3.5">
                      <ResourceMeter
                        label={MEMORY_SOURCE_LABELS[memory.source]}
                        valueText={`${formatBytes(memory.usedBytes)} / ${formatBytes(memory.totalBytes)}`}
                        percent={memory.usedPercent}
                        detail={`${formatBytes(memory.availableBytes)} available${
                          memory.hostTotalBytes > memory.totalBytes
                            ? ` (EC2 host total ${formatBytes(memory.hostTotalBytes)})`
                            : ''
                        }`}
                      />
                      <ResourceMeter
                        label="Node.js V8 heap"
                        valueText={`${formatBytes(memory.heapUsedBytes)} / ${formatBytes(memory.heapLimitBytes)}`}
                        percent={memory.heapUsedPercent}
                        warnAt={85}
                        critAt={95}
                      />
                      <ResourceMeter
                        label="Container / EBS disk"
                        valueText={`${formatBytes(storage.diskUsedBytes)} / ${formatBytes(storage.diskTotalBytes)}`}
                        percent={storage.diskUsedPercent}
                        detail={`${formatBytes(storage.diskAvailableBytes)} free for user processes`}
                        warnAt={85}
                        critAt={92}
                      />
                    </div>

                    <dl className="m-0 grid grid-cols-3 gap-3 border-t pt-3 text-xs">
                      <div>
                        <dt className="text-muted-foreground">PostgreSQL DB</dt>
                        <dd className="m-0 mt-1 font-mono font-medium tabular-nums text-foreground">
                          {formatBytes(storage.dbSizeBytes)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          S3 confirmed files
                        </dt>
                        <dd className="m-0 mt-1 font-mono font-medium tabular-nums text-foreground">
                          {formatBytes(storage.s3ReadyFilesBytes)}
                        </dd>
                        <span className="block text-[11px] tabular-nums text-muted-foreground">
                          {storage.s3ReadyFilesCount} ready,{' '}
                          {storage.s3PendingFilesCount} pending
                        </span>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Winston logs</dt>
                        <dd className="m-0 mt-1 font-mono font-medium tabular-nums text-foreground">
                          {formatBytes(storage.logsTotalBytes)}
                        </dd>
                        <span className="block text-[11px] tabular-nums text-muted-foreground">
                          {storage.logsFileCount} files in logs/
                        </span>
                      </div>
                    </dl>
                  </div>
                </section>
              </div>

              {/* Row 3: HTTP Load Chart + DB Pool & Response Breakdown */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                <section className="flex flex-col rounded-[5px] border bg-card lg:col-span-8">
                  <header className="flex min-h-[45px] flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
                    <h2 className="m-0 text-sm font-semibold">
                      HTTP throughput & latency (60m)
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums">
                      <span>
                        <span className="text-muted-foreground">5m rate: </span>
                        <span className="font-mono font-semibold text-foreground">
                          {traffic.requestsPerMinute5m} req/min
                        </span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Avg / p95: </span>
                        <span className="font-mono font-semibold text-foreground">
                          {traffic.avgLatencyMs60m} / {traffic.p95LatencyMs60m}{' '}
                          ms
                        </span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">5xx rate: </span>
                        <span
                          className={cn(
                            'font-mono font-semibold',
                            traffic.errorRate5xxPercent > 0
                              ? 'text-destructive'
                              : 'text-foreground',
                          )}
                        >
                          {traffic.errorRate5xxPercent}%
                        </span>
                      </span>
                    </div>
                  </header>
                  <div className="p-4">
                    <TrafficThroughputChart points={traffic.points} />
                  </div>
                </section>

                <section className="flex flex-col rounded-[5px] border bg-card lg:col-span-4">
                  <header className="flex min-h-[45px] items-center justify-between gap-2 border-b px-4 py-2.5">
                    <h2 className="m-0 text-sm font-semibold">
                      Connections & responses
                    </h2>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {traffic.totalRequests60m.toLocaleString('en-US')} total
                    </span>
                  </header>
                  <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                    <ResourceMeter
                      label="PostgreSQL connections"
                      valueText={`${dbPoolUsed} / ${dependencies.database.maxConnections}`}
                      percent={dbPoolPercent}
                      detail={`${dependencies.database.activeConnections} active, ${dependencies.database.idleConnections} idle, ${dependencies.database.waitingConnections} waiting`}
                    />

                    <div className="space-y-2 border-t pt-3 text-xs">
                      <p className="m-0 font-medium text-foreground">
                        HTTP status distribution (60m)
                      </p>
                      <div className="flex h-2 w-full overflow-hidden rounded-[2px] bg-muted">
                        {traffic.totalRequests60m > 0 && (
                          <>
                            <div
                              className="h-full bg-success"
                              style={{
                                width: `${(traffic.status2xx60m / traffic.totalRequests60m) * 100}%`,
                              }}
                            />
                            <div
                              className="h-full bg-warning"
                              style={{
                                width: `${(traffic.status4xx60m / traffic.totalRequests60m) * 100}%`,
                              }}
                            />
                            <div
                              className="h-full bg-destructive"
                              style={{
                                width: `${(traffic.status5xx60m / traffic.totalRequests60m) * 100}%`,
                              }}
                            />
                          </>
                        )}
                      </div>
                      <dl className="m-0 grid grid-cols-3 gap-2 pt-1 tabular-nums">
                        <div>
                          <dt className="text-muted-foreground">2xx OK</dt>
                          <dd className="m-0 font-mono font-semibold text-success">
                            {traffic.status2xx60m.toLocaleString('en-US')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">4xx Client</dt>
                          <dd className="m-0 font-mono font-semibold text-warning">
                            {traffic.status4xx60m.toLocaleString('en-US')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">5xx Server</dt>
                          <dd
                            className={cn(
                              'm-0 font-mono font-semibold',
                              traffic.status5xx60m > 0
                                ? 'text-destructive'
                                : 'text-foreground',
                            )}
                          >
                            {traffic.status5xx60m.toLocaleString('en-US')}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </section>
              </div>

              {/* Row 4: Top Endpoints + Recent 5xx Server Errors */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                <section className="flex flex-col rounded-[5px] border bg-card lg:col-span-7">
                  <header className="flex min-h-[45px] flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
                    <h2 className="m-0 text-sm font-semibold">
                      Endpoint performance (60m)
                    </h2>
                    <Segmented
                      label="Sort endpoints"
                      value={endpointSort}
                      options={SORT_OPTIONS}
                      onChange={setEndpointSort}
                    />
                  </header>
                  <div className="flex-1 overflow-x-auto">
                    {sortedEndpoints.length === 0 ? (
                      <div className="p-6">
                        <EmptyState
                          title="0 endpoint samples yet"
                          description="API route throughput and latency will populate as requests arrive."
                        />
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="border-b bg-muted/35 font-medium text-muted-foreground">
                          <tr>
                            <th className="px-3.5 py-2">Route</th>
                            <th className="px-3 py-2 text-right">Reqs</th>
                            <th className="px-3 py-2 text-right">Avg</th>
                            <th className="px-3 py-2 text-right">p95</th>
                            <th className="px-3.5 py-2 text-right">4xx / 5xx</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {sortedEndpoints.map((ep) => (
                            <tr
                              key={`${ep.method} ${ep.route}`}
                              className="hover:bg-muted/50"
                            >
                              <td className="max-w-72 truncate px-3.5 py-2 font-mono">
                                <span className="mr-1.5 rounded-[3px] border bg-muted/40 px-1 py-0 text-[10px] font-semibold text-foreground">
                                  {ep.method}
                                </span>
                                <span title={ep.route}>{ep.route}</span>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">
                                {ep.requests.toLocaleString('en-US')}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                                {ep.avgLatencyMs} ms
                              </td>
                              <td
                                className={cn(
                                  'whitespace-nowrap px-3 py-2 text-right font-mono font-medium tabular-nums',
                                  getUsageTone(
                                    ep.p95LatencyMs >= 500
                                      ? 95
                                      : ep.p95LatencyMs >= 200
                                        ? 82
                                        : 10,
                                  ).replace('bg-brand', 'text-foreground').replace('bg-', 'text-'),
                                )}
                              >
                                {ep.p95LatencyMs} ms
                              </td>
                              <td className="whitespace-nowrap px-3.5 py-2 text-right font-mono tabular-nums">
                                <span className="text-muted-foreground">
                                  {ep.errors4xx}
                                </span>{' '}
                                /{' '}
                                <span
                                  className={
                                    ep.errors5xx > 0
                                      ? 'font-semibold text-destructive'
                                      : 'text-muted-foreground'
                                  }
                                >
                                  {ep.errors5xx}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </section>

                <section className="flex flex-col rounded-[5px] border bg-card lg:col-span-5">
                  <header className="flex min-h-[45px] items-center justify-between gap-2 border-b px-4 py-2.5">
                    <h2 className="m-0 text-sm font-semibold">
                      Recent server errors (5xx)
                    </h2>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {traffic.recentErrors.length} recorded
                    </span>
                  </header>
                  <div className="flex-1">
                    {traffic.recentErrors.length === 0 ? (
                      <div className="p-6">
                        <EmptyState
                          title="0 server 5xx errors"
                          description="Unhandled exceptions captured by AllExceptionsFilter will appear here."
                        />
                      </div>
                    ) : (
                      <ul className="m-0 max-h-96 divide-y overflow-y-auto p-0">
                        {traffic.recentErrors.map((err) => (
                          <li key={err.id} className="list-none px-4 py-2.5">
                            <div className="flex items-baseline justify-between gap-2 text-xs">
                              <div className="min-w-0 truncate font-mono">
                                <span className="mr-1.5 rounded-[3px] border border-destructive/30 bg-destructive/10 px-1 py-0 text-[10px] font-semibold text-destructive">
                                  {err.statusCode}
                                </span>
                                <span className="font-medium text-foreground">
                                  {err.method} {err.path}
                                </span>
                              </div>
                              <span
                                title={formatDateTime(err.occurredAt)}
                                className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
                              >
                                {formatRelativeTime(err.occurredAt)}
                              </span>
                            </div>
                            <p className="m-0 mt-1 line-clamp-2 text-xs text-muted-foreground">
                              <span className="font-mono text-foreground/80">
                                {err.exceptionName}:
                              </span>{' '}
                              {err.message}
                            </p>
                            {err.requestId && (
                              <Link
                                to={`/audit-logs?requestId=${encodeURIComponent(err.requestId)}`}
                                className="mt-1 inline-block font-mono text-[11px] text-brand no-underline hover:underline"
                              >
                                Request {err.requestId.slice(0, 8)}…
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              </div>
            </div>
          );
        }}
      </AsyncView>
    </>
  );
};

export default MonitoringPage;
