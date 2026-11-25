import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileFacade } from '../../file/facades/file.facade.js';
import type { MonitoringRepository } from '../repositories/monitoring.repository.js';
import type {
  CollectorSnapshot,
  ContainerMetricsCollector,
} from './container-metrics.collector.js';
import { HttpMetricsStore } from './http-metrics.store.js';
import { MonitoringService } from './monitoring.service.js';

const makeSnapshot = (
  overrides: Partial<CollectorSnapshot> = {},
): CollectorSnapshot => ({
  runtime: {
    runtimeMode: 'DOCKER',
    cgroupVersion: 'v2',
    hostname: 'ec2-docker-01',
    platform: 'linux',
    arch: 'x64',
    nodeVersion: 'v22.0.0',
    environment: 'production',
    pid: 1,
    processUptimeSeconds: 3600,
    hostUptimeSeconds: 86400,
  },
  cpu: {
    usagePercent: 24,
    processPercent: 12,
    hostCores: 2,
    quotaCores: 2,
    loadAvg: [0.45, 0.32, 0.28],
    throttledCount: 0,
    throttledPercent: 0,
    eventLoopMeanMs: 2,
    eventLoopP95Ms: 8,
    eventLoopMaxMs: 18,
  },
  memory: {
    usedBytes: 512 * 1024 * 1024,
    totalBytes: 2048 * 1024 * 1024,
    availableBytes: 1536 * 1024 * 1024,
    usedPercent: 25,
    source: 'cgroup-v2',
    hostTotalBytes: 4096 * 1024 * 1024,
    rssBytes: 220 * 1024 * 1024,
    heapUsedBytes: 120 * 1024 * 1024,
    heapTotalBytes: 180 * 1024 * 1024,
    heapLimitBytes: 1024 * 1024 * 1024,
    heapUsedPercent: 11.7,
    externalBytes: 12 * 1024 * 1024,
  },
  disk: {
    totalBytes: 30 * 1024 * 1024 * 1024,
    usedBytes: 10 * 1024 * 1024 * 1024,
    availableBytes: 20 * 1024 * 1024 * 1024,
    usedPercent: 33.3,
  },
  logs: {
    fileCount: 4,
    totalBytes: 2 * 1024 * 1024,
  },
  ...overrides,
});

describe('MonitoringService', () => {
  let service: MonitoringService;
  let collector: Record<'collectSnapshot', ReturnType<typeof vi.fn>>;
  let monitoringRepo: Record<
    'pingDatabase' | 'getDatabaseAndFileStats',
    ReturnType<typeof vi.fn>
  >;
  let fileFacade: Record<'checkStorageHealth', ReturnType<typeof vi.fn>>;
  let httpMetrics: HttpMetricsStore;
  let configValues: Record<string, string | undefined>;

  beforeEach(() => {
    collector = {
      collectSnapshot: vi.fn().mockResolvedValue(makeSnapshot()),
    };
    monitoringRepo = {
      pingDatabase: vi.fn().mockResolvedValue(2),
      getDatabaseAndFileStats: vi.fn().mockResolvedValue({
        latencyMs: 3,
        dbSizeBytes: 64 * 1024 * 1024,
        maxConnections: 100,
        activeConnections: 2,
        idleConnections: 6,
        waitingConnections: 0,
        readyFileCount: 15,
        readyFileBytes: 42 * 1024 * 1024,
        pendingFileCount: 1,
      }),
    };
    fileFacade = {
      checkStorageHealth: vi.fn().mockResolvedValue({
        reachable: true,
        latencyMs: 38,
        bucket: 'hybrid-lms-bucket',
        region: 'ap-southeast-1',
      }),
    };
    httpMetrics = new HttpMetricsStore();
    configValues = {
      GOOGLE_CLIENT_ID: 'client-id',
      ZALO_BOT_TOKEN: undefined,
    };

    service = new MonitoringService(
      collector as unknown as ContainerMetricsCollector,
      httpMetrics,
      monitoringRepo as unknown as MonitoringRepository,
      fileFacade as unknown as FileFacade,
      {
        get: vi.fn((key: string) => configValues[key]),
      } as unknown as ConfigService,
    );
  });

  it('returns HEALTHY status and caches S3 health probes for 60s unless forced', async () => {
    const first = await service.getOverview(false);
    const second = await service.getOverview(false);
    expect(first.status).toBe('HEALTHY');
    expect(first.alerts).toHaveLength(0);
    expect(first.dependencies.integrations).toEqual({
      googleOAuthConfigured: true,
      zaloBotConfigured: false,
    });
    expect(second.dependencies.s3.bucket).toBe('hybrid-lms-bucket');
    expect(fileFacade.checkStorageHealth).toHaveBeenCalledTimes(1);

    await service.getOverview(true);
    expect(fileFacade.checkStorageHealth).toHaveBeenCalledTimes(2);
  });

  it('marks overall status DEGRADED on high container memory and CRITICAL on DB outage', async () => {
    const base = makeSnapshot();
    collector.collectSnapshot.mockResolvedValue(
      makeSnapshot({
        memory: { ...base.memory, usedPercent: 84 },
      }),
    );

    const degraded = await service.getOverview(false);
    expect(degraded.status).toBe('DEGRADED');
    expect(degraded.alerts.some((a) => a.key === 'mem-warning')).toBe(true);

    monitoringRepo.getDatabaseAndFileStats.mockRejectedValue(
      new Error('Connection terminated'),
    );
    const critical = await service.getOverview(false);
    expect(critical.status).toBe('CRITICAL');
    expect(critical.dependencies.database.status).toBe('DOWN');
  });

  it('throws 503 from checkHealth when PostgreSQL ping fails', async () => {
    await expect(service.checkHealth()).resolves.toMatchObject({ status: 'ok' });

    monitoringRepo.pingDatabase.mockRejectedValue(new Error('timeout'));
    await expect(service.checkHealth()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
