import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat, statfs } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import v8 from 'node:v8';

type IntervalHistogram = ReturnType<typeof monitorEventLoopDelay>;
import type {
  CpuMetrics,
  MemoryMetrics,
  MemorySource,
  RuntimeInfo,
  RuntimeMode,
} from '../types/monitoring-overview.type.js';
import {
  detectContainerRuntime,
  parseCgroupCpuStat,
  parseCgroupV1CpuQuota,
  parseCgroupV1Memory,
  parseCgroupV2CpuQuota,
  parseCgroupV2Memory,
  parseProcMeminfo,
} from '../utils/cgroup-linux.util.js';

const SAMPLE_INTERVAL_MS = 5000;
const LOG_STATS_CACHE_TTL_MS = 30_000;
const NS_TO_MS = 1_000_000;

interface HostCpuTotals {
  readonly active: number;
  readonly total: number;
}

export interface CollectorSnapshot {
  readonly runtime: RuntimeInfo;
  readonly cpu: CpuMetrics;
  readonly memory: MemoryMetrics;
  readonly disk: {
    readonly totalBytes: number;
    readonly usedBytes: number;
    readonly availableBytes: number;
    readonly usedPercent: number;
  };
  readonly logs: {
    readonly fileCount: number;
    readonly totalBytes: number;
  };
}

const roundTwo = (value: number): number => Math.round(value * 100) / 100;

const roundPercent = (value: number): number =>
  Math.min(100, Math.max(0, roundTwo(value)));

const readOptionalText = async (filePath: string): Promise<string | null> => {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
};

const readHostCpuTotals = (): HostCpuTotals => {
  let active = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    const t = cpu.times;
    const sum = t.user + t.nice + t.sys + t.idle + t.irq;
    active += sum - t.idle;
    total += sum;
  }
  return { active, total };
};

@Injectable()
export class ContainerMetricsCollector implements OnModuleInit, OnModuleDestroy {
  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private eventLoopHistogram: IntervalHistogram | null = null;

  private prevTimestampMs = Date.now();
  private prevHostCpu: HostCpuTotals = readHostCpuTotals();
  private prevProcessCpu: NodeJS.CpuUsage = process.cpuUsage();
  private prevCgroupCpuUsageUsec: number | null = null;
  private prevCgroupNrPeriods: number | null = null;
  private prevCgroupNrThrottled: number | null = null;

  private systemCpuPercent = 0;
  private processCpuPercent = 0;
  private throttledPercent: number | null = null;
  private throttledCount: number | null = null;
  private quotaCores: number | null = null;
  private cgroupVersion: 'v2' | 'v1' | null = null;
  private runtimeMode: RuntimeMode =
    process.platform === 'linux' ? 'LINUX_HOST' : 'LOCAL_OS';
  private eventLoopMeanMs = 0;
  private eventLoopP95Ms = 0;
  private eventLoopMaxMs = 0;

  private cachedLogsStats: {
    readonly checkedAtMs: number;
    readonly fileCount: number;
    readonly totalBytes: number;
  } | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.eventLoopHistogram = monitorEventLoopDelay({ resolution: 20 });
    this.eventLoopHistogram.enable();
    await this.detectEnvironment();
    await this.sampleNow();
    this.sampleTimer = setInterval(() => {
      void this.sampleNow();
    }, SAMPLE_INTERVAL_MS);
    this.sampleTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    this.eventLoopHistogram?.disable();
  }

  async collectSnapshot(): Promise<CollectorSnapshot> {
    const hostCores = Math.max(1, os.cpus().length);
    const [memory, disk, logs] = await Promise.all([
      this.collectMemory(),
      this.collectDisk(),
      this.collectLogsStats(),
    ]);
    const loadAvgRaw = process.platform === 'linux' ? os.loadavg() : null;
    const loadAvg: readonly [number, number, number] | null = loadAvgRaw
      ? [roundTwo(loadAvgRaw[0]), roundTwo(loadAvgRaw[1]), roundTwo(loadAvgRaw[2])]
      : null;

    return {
      runtime: {
        runtimeMode: this.runtimeMode,
        cgroupVersion: this.cgroupVersion,
        hostname: os.hostname(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        environment: this.configService.get<string>('NODE_ENV') ?? 'development',
        pid: process.pid,
        processUptimeSeconds: Math.floor(process.uptime()),
        hostUptimeSeconds: Math.floor(os.uptime()),
      },
      cpu: {
        usagePercent: this.systemCpuPercent,
        processPercent: this.processCpuPercent,
        hostCores,
        quotaCores: this.quotaCores,
        loadAvg,
        throttledCount: this.throttledCount,
        throttledPercent: this.throttledPercent,
        eventLoopMeanMs: this.eventLoopMeanMs,
        eventLoopP95Ms: this.eventLoopP95Ms,
        eventLoopMaxMs: this.eventLoopMaxMs,
      },
      memory,
      disk,
      logs,
    };
  }

  private async detectEnvironment(): Promise<void> {
    const proc1Cgroup =
      process.platform === 'linux'
        ? await readOptionalText('/proc/1/cgroup')
        : null;
    this.runtimeMode = detectContainerRuntime(
      existsSync('/.dockerenv'),
      existsSync('/run/.containerenv'),
      proc1Cgroup,
      process.platform,
    );
    if (process.platform !== 'linux') {
      this.cgroupVersion = null;
      this.quotaCores = null;
      return;
    }
    if (existsSync('/sys/fs/cgroup/cgroup.controllers')) {
      this.cgroupVersion = 'v2';
      this.quotaCores = parseCgroupV2CpuQuota(
        await readOptionalText('/sys/fs/cgroup/cpu.max'),
      );
      return;
    }
    if (existsSync('/sys/fs/cgroup/cpu') || existsSync('/sys/fs/cgroup/memory')) {
      this.cgroupVersion = 'v1';
      const [quotaRaw, periodRaw] = await Promise.all([
        readOptionalText('/sys/fs/cgroup/cpu/cpu.cfs_quota_us'),
        readOptionalText('/sys/fs/cgroup/cpu/cpu.cfs_period_us'),
      ]);
      this.quotaCores = parseCgroupV1CpuQuota(quotaRaw, periodRaw);
    }
  }

  private async sampleNow(): Promise<void> {
    const nowMs = Date.now();
    const elapsedMs = Math.max(1, nowMs - this.prevTimestampMs);
    const hostCores = Math.max(1, os.cpus().length);
    const effectiveCores = this.quotaCores ?? hostCores;

    // 1. Node.js process CPU% relative to effective cores
    const currentProcessCpu = process.cpuUsage();
    const procDeltaUs =
      currentProcessCpu.user -
      this.prevProcessCpu.user +
      (currentProcessCpu.system - this.prevProcessCpu.system);
    this.processCpuPercent = roundPercent(
      (procDeltaUs / (elapsedMs * 1000 * effectiveCores)) * 100,
    );
    this.prevProcessCpu = currentProcessCpu;

    // 2. Container CPU% (cgroup v2 usage_usec) or Host CPU% delta
    const hostTotals = readHostCpuTotals();
    const hostTotalDelta = hostTotals.total - this.prevHostCpu.total;
    const hostActiveDelta = hostTotals.active - this.prevHostCpu.active;
    this.prevHostCpu = hostTotals;

    const hostCpu =
      hostTotalDelta > 0
        ? roundPercent((hostActiveDelta / hostTotalDelta) * 100)
        : this.processCpuPercent;

    this.systemCpuPercent = await this.sampleCgroupCpu(
      elapsedMs,
      effectiveCores,
      hostCpu,
    );
    this.prevTimestampMs = nowMs;

    // 3. Event loop lag histogram (reset each sample interval)
    this.sampleEventLoopLag();
  }

  private async sampleCgroupCpu(
    elapsedMs: number,
    effectiveCores: number,
    fallbackCpu: number,
  ): Promise<number> {
    if (process.platform !== 'linux' || this.cgroupVersion === null) {
      return fallbackCpu;
    }
    const cpuStatPath =
      this.cgroupVersion === 'v2'
        ? '/sys/fs/cgroup/cpu.stat'
        : '/sys/fs/cgroup/cpu/cpu.stat';
    const stat = parseCgroupCpuStat(await readOptionalText(cpuStatPath));

    let measuredCpu = fallbackCpu;
    if (stat.usageUsec !== null && this.prevCgroupCpuUsageUsec !== null) {
      const deltaUsec = Math.max(0, stat.usageUsec - this.prevCgroupCpuUsageUsec);
      measuredCpu = roundPercent(
        (deltaUsec / (elapsedMs * 1000 * effectiveCores)) * 100,
      );
    }
    this.prevCgroupCpuUsageUsec = stat.usageUsec;
    this.updateThrottlingStats(stat.nrPeriods, stat.nrThrottled);
    return measuredCpu;
  }

  private updateThrottlingStats(
    nrPeriods: number | null,
    nrThrottled: number | null,
  ): void {
    if (nrThrottled === null) return;
    this.throttledCount = nrThrottled;
    if (
      nrPeriods !== null &&
      this.prevCgroupNrPeriods !== null &&
      this.prevCgroupNrThrottled !== null
    ) {
      const dPeriods = nrPeriods - this.prevCgroupNrPeriods;
      const dThrottled = Math.max(0, nrThrottled - this.prevCgroupNrThrottled);
      if (dPeriods > 0) {
        this.throttledPercent = roundPercent((dThrottled / dPeriods) * 100);
      }
    }
    this.prevCgroupNrPeriods = nrPeriods;
    this.prevCgroupNrThrottled = nrThrottled;
  }

  private sampleEventLoopLag(): void {
    if (!this.eventLoopHistogram) return;
    this.eventLoopMeanMs = roundTwo(this.eventLoopHistogram.mean / NS_TO_MS);
    this.eventLoopP95Ms = roundTwo(
      this.eventLoopHistogram.percentile(95) / NS_TO_MS,
    );
    this.eventLoopMaxMs = roundTwo(this.eventLoopHistogram.max / NS_TO_MS);
    this.eventLoopHistogram.reset();
  }

  private async collectMemory(): Promise<MemoryMetrics> {
    const hostTotalBytes = os.totalmem();
    const procMem = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    const heapLimitBytes = heapStats.heap_size_limit;
    const heapUsedPercent =
      heapLimitBytes > 0
        ? roundPercent((procMem.heapUsed / heapLimitBytes) * 100)
        : 0;

    let totalBytes = hostTotalBytes;
    let usedBytes = Math.max(0, hostTotalBytes - os.freemem());
    let availableBytes = os.freemem();
    let source: MemorySource = 'os-freemem';

    if (process.platform === 'linux') {
      const cgroupMem = await this.readCgroupMemory(hostTotalBytes);
      if (cgroupMem) {
        totalBytes = cgroupMem.totalBytes;
        usedBytes = Math.min(totalBytes, cgroupMem.usedBytes);
        availableBytes = Math.max(0, totalBytes - usedBytes);
        source = cgroupMem.source;
      } else {
        const procMeminfo = parseProcMeminfo(
          await readOptionalText('/proc/meminfo'),
        );
        if (procMeminfo) {
          totalBytes = procMeminfo.totalBytes;
          usedBytes = procMeminfo.usedBytes;
          availableBytes = procMeminfo.availableBytes;
          source = 'proc-meminfo';
        }
      }
    }

    const usedPercent =
      totalBytes > 0 ? roundPercent((usedBytes / totalBytes) * 100) : 0;

    return {
      usedBytes,
      totalBytes,
      availableBytes,
      usedPercent,
      source,
      hostTotalBytes,
      rssBytes: procMem.rss,
      heapUsedBytes: procMem.heapUsed,
      heapTotalBytes: procMem.heapTotal,
      heapLimitBytes,
      heapUsedPercent,
      externalBytes: procMem.external,
    };
  }

  private async readCgroupMemory(hostTotalBytes: number): Promise<{
    readonly usedBytes: number;
    readonly totalBytes: number;
    readonly source: MemorySource;
  } | null> {
    if (this.cgroupVersion === 'v2') {
      const [maxRaw, currentRaw, statRaw] = await Promise.all([
        readOptionalText('/sys/fs/cgroup/memory.max'),
        readOptionalText('/sys/fs/cgroup/memory.current'),
        readOptionalText('/sys/fs/cgroup/memory.stat'),
      ]);
      const parsed = parseCgroupV2Memory(maxRaw, currentRaw, statRaw);
      return parsed ? { ...parsed, source: 'cgroup-v2' } : null;
    }
    if (this.cgroupVersion === 'v1') {
      const [limitRaw, usageRaw, statRaw] = await Promise.all([
        readOptionalText('/sys/fs/cgroup/memory/memory.limit_in_bytes'),
        readOptionalText('/sys/fs/cgroup/memory/memory.usage_in_bytes'),
        readOptionalText('/sys/fs/cgroup/memory/memory.stat'),
      ]);
      const parsed = parseCgroupV1Memory(
        limitRaw,
        usageRaw,
        statRaw,
        hostTotalBytes,
      );
      return parsed ? { ...parsed, source: 'cgroup-v1' } : null;
    }
    return null;
  }

  private async collectDisk(): Promise<{
    readonly totalBytes: number;
    readonly usedBytes: number;
    readonly availableBytes: number;
    readonly usedPercent: number;
  }> {
    try {
      const stats = await statfs(process.cwd());
      const bsize = Number(stats.bsize);
      const totalBytes = Number(stats.blocks) * bsize;
      const availableBytes = Number(stats.bavail) * bsize;
      const usedBytes = Math.max(0, totalBytes - Number(stats.bfree) * bsize);
      const nonRootTotal = usedBytes + availableBytes;
      const usedPercent =
        nonRootTotal > 0 ? roundPercent((usedBytes / nonRootTotal) * 100) : 0;
      return { totalBytes, usedBytes, availableBytes, usedPercent };
    } catch {
      return {
        totalBytes: 0,
        usedBytes: 0,
        availableBytes: 0,
        usedPercent: 0,
      };
    }
  }

  private async collectLogsStats(): Promise<{
    readonly fileCount: number;
    readonly totalBytes: number;
  }> {
    const nowMs = Date.now();
    if (
      this.cachedLogsStats &&
      nowMs - this.cachedLogsStats.checkedAtMs < LOG_STATS_CACHE_TTL_MS
    ) {
      return {
        fileCount: this.cachedLogsStats.fileCount,
        totalBytes: this.cachedLogsStats.totalBytes,
      };
    }
    const logsDir = path.resolve(process.cwd(), 'logs');
    try {
      const entries = await readdir(logsDir, { withFileTypes: true });
      const files = entries.filter((entry) => entry.isFile());
      const sizes = await Promise.all(
        files.map(async (entry) => {
          try {
            const info = await stat(path.join(logsDir, entry.name));
            return info.size;
          } catch {
            return 0;
          }
        }),
      );
      const totalBytes = sizes.reduce((acc, size) => acc + size, 0);
      this.cachedLogsStats = {
        checkedAtMs: nowMs,
        fileCount: files.length,
        totalBytes,
      };
      return { fileCount: files.length, totalBytes };
    } catch {
      return { fileCount: 0, totalBytes: 0 };
    }
  }
}
