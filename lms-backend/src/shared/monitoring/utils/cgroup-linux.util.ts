import type { RuntimeMode } from '../types/monitoring-overview.type.js';

const KIB = 1024;
const UNBOUNDED_V1_LIMIT_FACTOR = 0.99;
const UUID_SEGMENT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_SEGMENT_PATTERN = /^\d+$/;

const parseIntStrict = (raw: string | null | undefined): number | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const parseKeyValueMap = (raw: string | null | undefined): Map<string, number> => {
  const map = new Map<string, number>();
  if (!raw) return map;
  for (const line of raw.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const parsed = Number(parts[1]);
    if (Number.isFinite(parsed)) {
      map.set(parts[0], parsed);
    }
  }
  return map;
};

/** Detects whether the Node process runs inside a Linux Docker container, bare Linux host, or local OS. */
export const detectContainerRuntime = (
  hasDockerEnv: boolean,
  hasContainerEnv: boolean,
  proc1Cgroup: string | null,
  platform: NodeJS.Platform,
): RuntimeMode => {
  if (hasDockerEnv || hasContainerEnv) return 'DOCKER';
  if (
    proc1Cgroup &&
    /(docker|containerd|kubepods|lxc|buildkit)/i.test(proc1Cgroup)
  ) {
    return 'DOCKER';
  }
  return platform === 'linux' ? 'LINUX_HOST' : 'LOCAL_OS';
};

/** Parses Linux cgroup v2 memory limits and usage, subtracting inactive file page cache like `docker stats`. */
export const parseCgroupV2Memory = (
  memoryMaxRaw: string | null,
  memoryCurrentRaw: string | null,
  memoryStatRaw: string | null,
): { readonly usedBytes: number; readonly totalBytes: number } | null => {
  if (!memoryMaxRaw || memoryMaxRaw.trim() === 'max') return null;
  const totalBytes = parseIntStrict(memoryMaxRaw);
  const currentBytes = parseIntStrict(memoryCurrentRaw);
  if (!totalBytes || totalBytes <= 0 || currentBytes === null) return null;
  const stats = parseKeyValueMap(memoryStatRaw);
  const inactiveFile = stats.get('inactive_file') ?? 0;
  return {
    usedBytes: Math.max(0, currentBytes - inactiveFile),
    totalBytes,
  };
};

/** Parses Linux cgroup v1 memory limits when a container cap below host RAM is configured. */
export const parseCgroupV1Memory = (
  limitRaw: string | null,
  usageRaw: string | null,
  statRaw: string | null,
  hostTotalBytes: number,
): { readonly usedBytes: number; readonly totalBytes: number } | null => {
  if (!limitRaw || !usageRaw) return null;
  const trimmedLimit = limitRaw.trim();
  if (!/^\d+$/.test(trimmedLimit)) return null;
  const totalBytes = Number(trimmedLimit);
  if (
    !Number.isFinite(totalBytes) ||
    totalBytes <= 0 ||
    totalBytes >= hostTotalBytes * UNBOUNDED_V1_LIMIT_FACTOR
  ) {
    return null;
  }
  const usageBytes = Number(usageRaw.trim());
  if (!Number.isFinite(usageBytes) || usageBytes < 0) return null;
  const stats = parseKeyValueMap(statRaw);
  const inactiveFile = stats.get('total_inactive_file') ?? 0;
  return {
    usedBytes: Math.max(0, usageBytes - inactiveFile),
    totalBytes,
  };
};

/** Parses Ubuntu/Linux `/proc/meminfo` using MemAvailable so disk cache is not counted as pressure. */
export const parseProcMeminfo = (
  meminfoRaw: string | null,
): {
  readonly totalBytes: number;
  readonly availableBytes: number;
  readonly usedBytes: number;
} | null => {
  if (!meminfoRaw) return null;
  const valuesKb = new Map<string, number>();
  for (const line of meminfoRaw.split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_()]+):\s+(\d+)\s*kB/i.exec(line.trim());
    if (match) {
      valuesKb.set(match[1], Number(match[2]));
    }
  }
  const totalKb = valuesKb.get('MemTotal');
  if (!totalKb || totalKb <= 0) return null;
  const availableKb =
    valuesKb.get('MemAvailable') ??
    Math.min(
      totalKb,
      (valuesKb.get('MemFree') ?? 0) +
        (valuesKb.get('Buffers') ?? 0) +
        (valuesKb.get('Cached') ?? 0),
    );
  const totalBytes = totalKb * KIB;
  const availableBytes = Math.min(totalBytes, Math.max(0, availableKb * KIB));
  return {
    totalBytes,
    availableBytes,
    usedBytes: Math.max(0, totalBytes - availableBytes),
  };
};

/** Parses cgroup v2 `cpu.max` (`"<quota> <period>"`) into effective vCPU quota cores. */
export const parseCgroupV2CpuQuota = (cpuMaxRaw: string | null): number | null => {
  if (!cpuMaxRaw) return null;
  const [quotaStr, periodStr] = cpuMaxRaw.trim().split(/\s+/);
  if (!quotaStr || quotaStr === 'max') return null;
  const quota = Number(quotaStr);
  const period = Number(periodStr);
  if (!Number.isFinite(quota) || !Number.isFinite(period) || quota <= 0 || period <= 0) {
    return null;
  }
  return Math.round((quota / period) * 100) / 100;
};

/** Parses cgroup v1 `cpu.cfs_quota_us` and `cpu.cfs_period_us` into effective vCPU quota cores. */
export const parseCgroupV1CpuQuota = (
  quotaRaw: string | null,
  periodRaw: string | null,
): number | null => {
  if (!quotaRaw || !periodRaw) return null;
  const quota = Number(quotaRaw.trim());
  const period = Number(periodRaw.trim());
  if (!Number.isFinite(quota) || !Number.isFinite(period) || quota <= 0 || period <= 0) {
    return null;
  }
  return Math.round((quota / period) * 100) / 100;
};

export interface CgroupCpuStatSnapshot {
  readonly usageUsec: number | null;
  readonly nrPeriods: number | null;
  readonly nrThrottled: number | null;
  readonly throttledUsec: number | null;
}

/** Parses cgroup v2 `cpu.stat` or cgroup v1 `cpu.stat` key-value output. */
export const parseCgroupCpuStat = (
  statRaw: string | null,
): CgroupCpuStatSnapshot => {
  const map = parseKeyValueMap(statRaw);
  const usageUsec = map.get('usage_usec') ?? null;
  const nrPeriods = map.get('nr_periods') ?? null;
  const nrThrottled = map.get('nr_throttled') ?? null;
  const throttledUsec =
    map.get('throttled_usec') ??
    (map.has('throttled_time')
      ? Math.round((map.get('throttled_time') ?? 0) / 1000)
      : null);
  return { usageUsec, nrPeriods, nrThrottled, throttledUsec };
};

/** Computes a nearest-rank percentile on an ascending sorted numeric array. */
export const computePercentile = (
  sortedAsc: readonly number[],
  percentile: number,
): number => {
  if (sortedAsc.length === 0) return 0;
  const index = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.ceil((percentile / 100) * sortedAsc.length) - 1),
  );
  return sortedAsc[index];
};

/** Normalizes Express route templates (or raw 404 URLs) to keep endpoint metrics bounded. */
export const normalizeRoutePath = (
  method: string,
  baseUrl: string,
  routePath: string | undefined,
  rawUrl: string,
): { readonly method: string; readonly route: string } => {
  const normalizedMethod = method.toUpperCase();
  if (routePath !== undefined) {
    const joined = `${baseUrl}${routePath}`.replace(/\/+/g, '/');
    return {
      method: normalizedMethod,
      route: joined === '/' ? '/' : joined.replace(/\/$/, ''),
    };
  }
  const pathOnly = rawUrl.split('?')[0] || '/';
  const collapsed = pathOnly
    .split('/')
    .map((segment) =>
      UUID_SEGMENT_PATTERN.test(segment) || NUMERIC_SEGMENT_PATTERN.test(segment)
        ? ':id'
        : segment,
    )
    .join('/');
  return {
    method: normalizedMethod,
    route: collapsed || '/',
  };
};
