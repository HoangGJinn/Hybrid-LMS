import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileFacade, type StorageHealthStatus } from '../../file/facades/file.facade.js';
import { MonitoringRepository } from '../repositories/monitoring.repository.js';
import type {
  CpuMetrics,
  DatabaseDependencyCheck,
  MemoryMetrics,
  MonitoringAlert,
  OverallHealthStatus,
  PublicHealthCheck,
  S3DependencyCheck,
  ServiceStatus,
  SystemMonitoringOverview,
} from '../types/monitoring-overview.type.js';
import {
  ContainerMetricsCollector,
  type CollectorSnapshot,
} from './container-metrics.collector.js';
import { HttpMetricsStore } from './http-metrics.store.js';

const S3_HEALTH_CACHE_TTL_MS = 60_000;
const MIN_5M_REQUESTS_FOR_RATE_CRITICAL = 10;

interface CachedS3Health {
  readonly checkedAtIso: string;
  readonly checkedAtMs: number;
  readonly result: StorageHealthStatus;
}

@Injectable()
export class MonitoringService {
  private cachedS3Health: CachedS3Health | null = null;

  constructor(
    private readonly collector: ContainerMetricsCollector,
    private readonly httpMetrics: HttpMetricsStore,
    private readonly monitoringRepo: MonitoringRepository,
    private readonly fileFacade: FileFacade,
    private readonly configService: ConfigService,
  ) {}

  async checkHealth(): Promise<PublicHealthCheck> {
    try {
      await this.monitoringRepo.pingDatabase();
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  async getOverview(forceRefresh = false): Promise<SystemMonitoringOverview> {
    const [snapshot, dbStatsResult, s3Health] = await Promise.all([
      this.collector.collectSnapshot(),
      this.readDatabaseStatsSafe(),
      this.readS3Health(forceRefresh),
    ]);

    const traffic = this.httpMetrics.getTrafficSummary();
    const recent5m = this.httpMetrics.getLast5mErrorStats();

    const apiStatus: ServiceStatus =
      snapshot.cpu.eventLoopP95Ms >= 100 ? 'DEGRADED' : 'UP';

    const alerts = this.evaluateAlerts({
      snapshot,
      database: dbStatsResult.dependency,
      s3: s3Health,
      requests5m: recent5m.requests5m,
      errors5xx5m: recent5m.errors5xx5m,
    });

    const overallStatus = this.deriveOverallStatus(
      alerts,
      dbStatsResult.dependency.status,
      s3Health.status,
    );

    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const zaloToken = this.configService.get<string>('ZALO_BOT_TOKEN');

    return {
      generatedAt: new Date().toISOString(),
      status: overallStatus,
      alerts,
      runtime: snapshot.runtime,
      dependencies: {
        api: {
          status: apiStatus,
          eventLoopP95Ms: snapshot.cpu.eventLoopP95Ms,
          inFlightRequests: traffic.inFlightRequests,
        },
        database: dbStatsResult.dependency,
        s3: s3Health,
        integrations: {
          googleOAuthConfigured: Boolean(googleClientId?.trim()),
          zaloBotConfigured: Boolean(zaloToken?.trim()),
        },
      },
      cpu: snapshot.cpu,
      memory: snapshot.memory,
      storage: {
        diskTotalBytes: snapshot.disk.totalBytes,
        diskUsedBytes: snapshot.disk.usedBytes,
        diskAvailableBytes: snapshot.disk.availableBytes,
        diskUsedPercent: snapshot.disk.usedPercent,
        dbSizeBytes: dbStatsResult.dbSizeBytes,
        s3ReadyFilesCount: dbStatsResult.readyFileCount,
        s3ReadyFilesBytes: dbStatsResult.readyFileBytes,
        s3PendingFilesCount: dbStatsResult.pendingFileCount,
        logsFileCount: snapshot.logs.fileCount,
        logsTotalBytes: snapshot.logs.totalBytes,
      },
      traffic,
    };
  }

  private async readDatabaseStatsSafe(): Promise<{
    readonly dependency: DatabaseDependencyCheck;
    readonly dbSizeBytes: number;
    readonly readyFileCount: number;
    readonly readyFileBytes: number;
    readonly pendingFileCount: number;
  }> {
    try {
      const stats = await this.monitoringRepo.getDatabaseAndFileStats();
      const totalUsed = stats.activeConnections + stats.idleConnections;
      const ratio =
        stats.maxConnections > 0 ? totalUsed / stats.maxConnections : 0;
      const status: ServiceStatus =
        stats.waitingConnections > 0 || ratio >= 0.8 || stats.latencyMs >= 250
          ? 'DEGRADED'
          : 'UP';

      return {
        dependency: {
          status,
          latencyMs: stats.latencyMs,
          activeConnections: stats.activeConnections,
          idleConnections: stats.idleConnections,
          waitingConnections: stats.waitingConnections,
          maxConnections: stats.maxConnections,
        },
        dbSizeBytes: stats.dbSizeBytes,
        readyFileCount: stats.readyFileCount,
        readyFileBytes: stats.readyFileBytes,
        pendingFileCount: stats.pendingFileCount,
      };
    } catch (error) {
      return {
        dependency: {
          status: 'DOWN',
          latencyMs: 0,
          activeConnections: 0,
          idleConnections: 0,
          waitingConnections: 0,
          maxConnections: 0,
          detail:
            error instanceof Error
              ? error.message.slice(0, 160)
              : 'Database unreachable',
        },
        dbSizeBytes: 0,
        readyFileCount: 0,
        readyFileBytes: 0,
        pendingFileCount: 0,
      };
    }
  }

  private async readS3Health(forceRefresh: boolean): Promise<S3DependencyCheck> {
    const nowMs = Date.now();
    if (
      !forceRefresh &&
      this.cachedS3Health &&
      nowMs - this.cachedS3Health.checkedAtMs < S3_HEALTH_CACHE_TTL_MS
    ) {
      const { result, checkedAtIso } = this.cachedS3Health;
      return {
        status: result.reachable ? 'UP' : 'DOWN',
        latencyMs: result.latencyMs,
        bucket: result.bucket,
        region: result.region,
        checkedAt: checkedAtIso,
        detail: result.detail,
      };
    }

    const result = await this.fileFacade.checkStorageHealth();
    const checkedAtIso = new Date(nowMs).toISOString();
    this.cachedS3Health = { checkedAtMs: nowMs, checkedAtIso, result };
    return {
      status: result.reachable ? 'UP' : 'DOWN',
      latencyMs: result.latencyMs,
      bucket: result.bucket,
      region: result.region,
      checkedAt: checkedAtIso,
      detail: result.detail,
    };
  }

  private evaluateAlerts(input: {
    readonly snapshot: CollectorSnapshot;
    readonly database: DatabaseDependencyCheck;
    readonly s3: S3DependencyCheck;
    readonly requests5m: number;
    readonly errors5xx5m: number;
  }): MonitoringAlert[] {
    const alerts: MonitoringAlert[] = [];
    const { memory, cpu, disk } = input.snapshot;

    if (input.database.status === 'DOWN') {
      alerts.push({
        key: 'db-down',
        severity: 'critical',
        message: 'PostgreSQL database query check failed.',
      });
    } else if (input.database.waitingConnections > 0) {
      alerts.push({
        key: 'db-waiting',
        severity: 'warning',
        message: `${input.database.waitingConnections} PostgreSQL queries are waiting on locks or connections.`,
      });
    } else if (input.database.status === 'DEGRADED') {
      alerts.push({
        key: 'db-degraded',
        severity: 'warning',
        message: `PostgreSQL latency (${input.database.latencyMs}ms) or pool usage is elevated.`,
      });
    }

    if (input.s3.status === 'DOWN') {
      alerts.push({
        key: 's3-down',
        severity: 'critical',
        message: `AWS S3 bucket ${input.s3.bucket} failed connectivity probe.`,
      });
    }

    this.pushResourceAlerts(alerts, memory, cpu, disk);

    if (
      input.requests5m >= MIN_5M_REQUESTS_FOR_RATE_CRITICAL &&
      (input.errors5xx5m / input.requests5m) * 100 >= 10
    ) {
      alerts.push({
        key: 'http-5xx-spike',
        severity: 'critical',
        message: `High server error rate: ${input.errors5xx5m} of ${input.requests5m} requests returned 5xx in the last 5m.`,
      });
    } else if (input.errors5xx5m > 0) {
      alerts.push({
        key: 'http-5xx-recent',
        severity: 'warning',
        message: `${input.errors5xx5m} server 5xx error${input.errors5xx5m === 1 ? '' : 's'} occurred in the last 5m.`,
      });
    }

    return alerts;
  }

  private pushResourceAlerts(
    alerts: MonitoringAlert[],
    memory: MemoryMetrics,
    cpu: CpuMetrics,
    disk: CollectorSnapshot['disk'],
  ): void {
    if (memory.usedPercent >= 92) {
      alerts.push({
        key: 'mem-critical',
        severity: 'critical',
        message: `Memory usage is at ${memory.usedPercent}% (${memory.source}); OOM kill risk is high.`,
      });
    } else if (memory.usedPercent >= 80) {
      alerts.push({
        key: 'mem-warning',
        severity: 'warning',
        message: `Memory usage is elevated at ${memory.usedPercent}% (${memory.source}).`,
      });
    }

    if (memory.heapUsedPercent >= 85) {
      alerts.push({
        key: 'heap-warning',
        severity: 'warning',
        message: `Node.js V8 heap usage reached ${memory.heapUsedPercent}% of heap limit.`,
      });
    }

    if (disk.usedPercent >= 92) {
      alerts.push({
        key: 'disk-critical',
        severity: 'critical',
        message: `Filesystem usage is critical at ${disk.usedPercent}%.`,
      });
    } else if (disk.usedPercent >= 85) {
      alerts.push({
        key: 'disk-warning',
        severity: 'warning',
        message: `Filesystem usage is high at ${disk.usedPercent}%.`,
      });
    }

    if (cpu.usagePercent >= 85) {
      alerts.push({
        key: 'cpu-warning',
        severity: 'warning',
        message: `CPU utilization is high at ${cpu.usagePercent}%.`,
      });
    }

    if (cpu.throttledPercent !== null && cpu.throttledPercent >= 15) {
      alerts.push({
        key: 'cpu-throttled',
        severity: 'warning',
        message: `Container CPU is being throttled (${cpu.throttledPercent}% of cgroup periods).`,
      });
    }

    if (cpu.eventLoopP95Ms >= 100) {
      alerts.push({
        key: 'event-loop-lag',
        severity: 'warning',
        message: `Node.js event loop p95 lag reached ${cpu.eventLoopP95Ms}ms.`,
      });
    }
  }

  private deriveOverallStatus(
    alerts: readonly MonitoringAlert[],
    dbStatus: ServiceStatus,
    s3Status: ServiceStatus,
  ): OverallHealthStatus {
    if (
      dbStatus === 'DOWN' ||
      s3Status === 'DOWN' ||
      alerts.some((a) => a.severity === 'critical')
    ) {
      return 'CRITICAL';
    }
    if (alerts.length > 0) {
      return 'DEGRADED';
    }
    return 'HEALTHY';
  }
}
