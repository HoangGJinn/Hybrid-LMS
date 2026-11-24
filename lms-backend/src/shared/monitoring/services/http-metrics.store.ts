import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  EndpointMetricItem,
  RecentServerErrorItem,
  TrafficMinutePoint,
  TrafficSummary,
} from '../types/monitoring-overview.type.js';
import { computePercentile } from '../utils/cgroup-linux.util.js';

const WINDOW_MINUTES = 60;
const MS_PER_MINUTE = 60_000;
const MAX_MINUTE_LATENCIES = 256;
const MAX_ENDPOINT_LATENCIES = 128;
const MAX_ENDPOINTS_PER_MINUTE = 100;
const MAX_TOP_ENDPOINTS = 15;
const MAX_RECENT_ERRORS = 50;
const IGNORED_PREFIXES = [
  '/api/health',
  '/api/admin/monitoring',
  '/api/docs',
] as const;

interface EndpointBucket {
  readonly method: string;
  readonly route: string;
  requests: number;
  errors4xx: number;
  errors5xx: number;
  totalDurationMs: number;
  maxLatencyMs: number;
  latencies: number[];
}

interface MinuteBucket {
  minuteEpoch: number;
  requests: number;
  status2xx: number;
  status4xx: number;
  status5xx: number;
  totalDurationMs: number;
  latencies: number[];
  endpoints: Map<string, EndpointBucket>;
}

export interface RecordHttpRequestInput {
  readonly method: string;
  readonly route: string;
  readonly statusCode: number;
  readonly durationMs: number;
  readonly nowMs?: number;
}

export interface RecordServerErrorInput {
  readonly occurredAt: string;
  readonly method: string;
  readonly path: string;
  readonly statusCode: number;
  readonly message: string;
  readonly exceptionName: string;
  readonly requestId: string | null;
}

const createEmptyBucket = (minuteEpoch: number): MinuteBucket => ({
  minuteEpoch,
  requests: 0,
  status2xx: 0,
  status4xx: 0,
  status5xx: 0,
  totalDurationMs: 0,
  latencies: [],
  endpoints: new Map(),
});

const pushBoundedSample = (
  target: number[],
  value: number,
  maxLength: number,
  seenCount: number,
): void => {
  if (target.length < maxLength) {
    target.push(value);
    return;
  }
  const slot = seenCount % maxLength;
  target[slot] = value;
};

const roundTwo = (value: number): number => Math.round(value * 100) / 100;

@Injectable()
export class HttpMetricsStore {
  private readonly buckets: MinuteBucket[] = Array.from(
    { length: WINDOW_MINUTES },
    () => createEmptyBucket(-1),
  );
  private readonly recentErrors: RecentServerErrorItem[] = [];
  private inFlight = 0;

  shouldIgnorePath(rawUrl: string): boolean {
    const cleanPath = rawUrl.split('?')[0] || '/';
    return IGNORED_PREFIXES.some(
      (prefix) =>
        cleanPath === prefix || cleanPath.startsWith(`${prefix}/`),
    );
  }

  incrementInFlight(): void {
    this.inFlight += 1;
  }

  decrementInFlight(): void {
    this.inFlight = Math.max(0, this.inFlight - 1);
  }

  getInFlight(): number {
    return this.inFlight;
  }

  recordRequest(input: RecordHttpRequestInput): void {
    const nowMs = input.nowMs ?? Date.now();
    const minuteEpoch = Math.floor(nowMs / MS_PER_MINUTE);
    const slot = minuteEpoch % WINDOW_MINUTES;
    let bucket = this.buckets[slot];
    if (bucket.minuteEpoch !== minuteEpoch) {
      bucket = createEmptyBucket(minuteEpoch);
      this.buckets[slot] = bucket;
    }

    const duration = Math.max(0, roundTwo(input.durationMs));
    bucket.requests += 1;
    bucket.totalDurationMs += duration;
    pushBoundedSample(
      bucket.latencies,
      duration,
      MAX_MINUTE_LATENCIES,
      bucket.requests - 1,
    );

    if (input.statusCode >= 500) {
      bucket.status5xx += 1;
    } else if (input.statusCode >= 400) {
      bucket.status4xx += 1;
    } else if (input.statusCode >= 200) {
      bucket.status2xx += 1;
    }

    const endpointKey = `${input.method} ${input.route}`;
    let endpoint = bucket.endpoints.get(endpointKey);
    if (!endpoint) {
      if (bucket.endpoints.size >= MAX_ENDPOINTS_PER_MINUTE) {
        return;
      }
      endpoint = {
        method: input.method,
        route: input.route,
        requests: 0,
        errors4xx: 0,
        errors5xx: 0,
        totalDurationMs: 0,
        maxLatencyMs: 0,
        latencies: [],
      };
      bucket.endpoints.set(endpointKey, endpoint);
    }

    endpoint.requests += 1;
    endpoint.totalDurationMs += duration;
    if (duration > endpoint.maxLatencyMs) {
      endpoint.maxLatencyMs = duration;
    }
    if (input.statusCode >= 500) {
      endpoint.errors5xx += 1;
    } else if (input.statusCode >= 400) {
      endpoint.errors4xx += 1;
    }
    pushBoundedSample(
      endpoint.latencies,
      duration,
      MAX_ENDPOINT_LATENCIES,
      endpoint.requests - 1,
    );
  }

  recordServerError(input: RecordServerErrorInput): void {
    const entry: RecentServerErrorItem = {
      id: randomUUID(),
      occurredAt: input.occurredAt,
      method: input.method.toUpperCase(),
      path: input.path.slice(0, 200),
      statusCode: input.statusCode,
      message: input.message.slice(0, 240),
      exceptionName: input.exceptionName.slice(0, 80),
      requestId: input.requestId,
    };
    this.recentErrors.unshift(entry);
    if (this.recentErrors.length > MAX_RECENT_ERRORS) {
      this.recentErrors.length = MAX_RECENT_ERRORS;
    }
  }

  private mergeBucketEndpoints(
    endpointMap: Map<string, EndpointBucket>,
    bucket: MinuteBucket,
  ): void {
    for (const [key, ep] of bucket.endpoints.entries()) {
      const agg = endpointMap.get(key);
      if (!agg) {
        endpointMap.set(key, {
          method: ep.method,
          route: ep.route,
          requests: ep.requests,
          errors4xx: ep.errors4xx,
          errors5xx: ep.errors5xx,
          totalDurationMs: ep.totalDurationMs,
          maxLatencyMs: ep.maxLatencyMs,
          latencies: [...ep.latencies],
        });
        continue;
      }
      agg.requests += ep.requests;
      agg.errors4xx += ep.errors4xx;
      agg.errors5xx += ep.errors5xx;
      agg.totalDurationMs += ep.totalDurationMs;
      agg.maxLatencyMs = Math.max(agg.maxLatencyMs, ep.maxLatencyMs);
      agg.latencies.push(...ep.latencies);
    }
  }

  private toTopEndpoints(
    endpointMap: ReadonlyMap<string, EndpointBucket>,
  ): EndpointMetricItem[] {
    return [...endpointMap.values()]
      .map((ep) => {
        const sorted = [...ep.latencies].sort((a, b) => a - b);
        const p95 = roundTwo(computePercentile(sorted, 95));
        return {
          method: ep.method,
          route: ep.route,
          requests: ep.requests,
          errors4xx: ep.errors4xx,
          errors5xx: ep.errors5xx,
          errorRatePercent:
            ep.requests > 0
              ? roundTwo(((ep.errors4xx + ep.errors5xx) / ep.requests) * 100)
              : 0,
          avgLatencyMs:
            ep.requests > 0 ? roundTwo(ep.totalDurationMs / ep.requests) : 0,
          p95LatencyMs: p95,
          maxLatencyMs: roundTwo(ep.maxLatencyMs),
        };
      })
      .sort((a, b) => b.p95LatencyMs - a.p95LatencyMs || b.requests - a.requests)
      .slice(0, MAX_TOP_ENDPOINTS);
  }

  private buildMinutePoint(
    epoch: number,
    bucket: MinuteBucket | undefined,
  ): TrafficMinutePoint {
    const minute = new Date(epoch * MS_PER_MINUTE).toISOString();
    if (!bucket) {
      return {
        minute,
        requests: 0,
        status2xx: 0,
        status4xx: 0,
        status5xx: 0,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
      };
    }
    const sorted = [...bucket.latencies].sort((a, b) => a - b);
    return {
      minute,
      requests: bucket.requests,
      status2xx: bucket.status2xx,
      status4xx: bucket.status4xx,
      status5xx: bucket.status5xx,
      avgLatencyMs:
        bucket.requests > 0
          ? roundTwo(bucket.totalDurationMs / bucket.requests)
          : 0,
      p95LatencyMs: roundTwo(computePercentile(sorted, 95)),
    };
  }

  getTrafficSummary(nowMs: number = Date.now()): TrafficSummary {
    const currentEpoch = Math.floor(nowMs / MS_PER_MINUTE);
    const oldestEpoch = currentEpoch - (WINDOW_MINUTES - 1);

    const activeByEpoch = new Map<number, MinuteBucket>();
    for (const bucket of this.buckets) {
      if (bucket.minuteEpoch >= oldestEpoch && bucket.minuteEpoch <= currentEpoch) {
        activeByEpoch.set(bucket.minuteEpoch, bucket);
      }
    }

    const points: TrafficMinutePoint[] = [];
    const allLatencies: number[] = [];
    const endpointMap = new Map<string, EndpointBucket>();

    let totalRequests60m = 0;
    let status2xx60m = 0;
    let status4xx60m = 0;
    let status5xx60m = 0;
    let totalDuration60m = 0;
    let last5mRequests = 0;

    for (let epoch = oldestEpoch; epoch <= currentEpoch; epoch += 1) {
      const bucket = activeByEpoch.get(epoch);
      points.push(this.buildMinutePoint(epoch, bucket));
      if (!bucket) continue;

      totalRequests60m += bucket.requests;
      status2xx60m += bucket.status2xx;
      status4xx60m += bucket.status4xx;
      status5xx60m += bucket.status5xx;
      totalDuration60m += bucket.totalDurationMs;
      if (epoch > currentEpoch - 5) last5mRequests += bucket.requests;
      allLatencies.push(...bucket.latencies);
      this.mergeBucketEndpoints(endpointMap, bucket);
    }

    allLatencies.sort((a, b) => a - b);
    const avgLatencyMs60m =
      totalRequests60m > 0 ? roundTwo(totalDuration60m / totalRequests60m) : 0;
    const p95LatencyMs60m = roundTwo(computePercentile(allLatencies, 95));
    const errorRate5xxPercent =
      totalRequests60m > 0
        ? roundTwo((status5xx60m / totalRequests60m) * 100)
        : 0;

    const topEndpoints = this.toTopEndpoints(endpointMap);

    return {
      windowMinutes: WINDOW_MINUTES,
      inFlightRequests: this.inFlight,
      requestsPerMinute5m: roundTwo(last5mRequests / 5),
      totalRequests60m,
      status2xx60m,
      status4xx60m,
      status5xx60m,
      errorRate5xxPercent,
      avgLatencyMs60m,
      p95LatencyMs60m,
      points,
      topEndpoints,
      recentErrors: [...this.recentErrors],
    };
  }

  getLast5mErrorStats(nowMs: number = Date.now()): {
    readonly requests5m: number;
    readonly errors5xx5m: number;
  } {
    const currentEpoch = Math.floor(nowMs / MS_PER_MINUTE);
    const minEpoch = currentEpoch - 4;
    let requests5m = 0;
    let errors5xx5m = 0;
    for (const bucket of this.buckets) {
      if (bucket.minuteEpoch >= minEpoch && bucket.minuteEpoch <= currentEpoch) {
        requests5m += bucket.requests;
        errors5xx5m += bucket.status5xx;
      }
    }
    return { requests5m, errors5xx5m };
  }
}
