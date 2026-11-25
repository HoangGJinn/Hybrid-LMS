export type OverallHealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';

export type ServiceStatus = 'UP' | 'DEGRADED' | 'DOWN' | 'UNCONFIGURED';

export type RuntimeMode = 'DOCKER' | 'LINUX_HOST' | 'LOCAL_OS';

export type MemorySource =
  | 'cgroup-v2'
  | 'cgroup-v1'
  | 'proc-meminfo'
  | 'os-freemem';

export interface MonitoringAlert {
  readonly key: string;
  readonly severity: 'warning' | 'critical';
  readonly message: string;
}

export interface RuntimeInfo {
  readonly runtimeMode: RuntimeMode;
  readonly cgroupVersion: 'v2' | 'v1' | null;
  readonly hostname: string;
  readonly platform: string;
  readonly arch: string;
  readonly nodeVersion: string;
  readonly environment: string;
  readonly pid: number;
  readonly processUptimeSeconds: number;
  readonly hostUptimeSeconds: number;
}

export interface CpuMetrics {
  readonly usagePercent: number;
  readonly processPercent: number;
  readonly hostCores: number;
  readonly quotaCores: number | null;
  readonly loadAvg: readonly [number, number, number] | null;
  readonly throttledCount: number | null;
  readonly throttledPercent: number | null;
  readonly eventLoopMeanMs: number;
  readonly eventLoopP95Ms: number;
  readonly eventLoopMaxMs: number;
}

export interface MemoryMetrics {
  readonly usedBytes: number;
  readonly totalBytes: number;
  readonly availableBytes: number;
  readonly usedPercent: number;
  readonly source: MemorySource;
  readonly hostTotalBytes: number;
  readonly rssBytes: number;
  readonly heapUsedBytes: number;
  readonly heapTotalBytes: number;
  readonly heapLimitBytes: number;
  readonly heapUsedPercent: number;
  readonly externalBytes: number;
}

export interface StorageMetrics {
  readonly diskTotalBytes: number;
  readonly diskUsedBytes: number;
  readonly diskAvailableBytes: number;
  readonly diskUsedPercent: number;
  readonly dbSizeBytes: number;
  readonly s3ReadyFilesCount: number;
  readonly s3ReadyFilesBytes: number;
  readonly s3PendingFilesCount: number;
  readonly logsFileCount: number;
  readonly logsTotalBytes: number;
}

export interface ApiDependencyCheck {
  readonly status: ServiceStatus;
  readonly eventLoopP95Ms: number;
  readonly inFlightRequests: number;
}

export interface DatabaseDependencyCheck {
  readonly status: ServiceStatus;
  readonly latencyMs: number;
  readonly activeConnections: number;
  readonly idleConnections: number;
  readonly waitingConnections: number;
  readonly maxConnections: number;
  readonly detail?: string;
}

export interface S3DependencyCheck {
  readonly status: ServiceStatus;
  readonly latencyMs: number;
  readonly bucket: string;
  readonly region: string;
  readonly checkedAt: string;
  readonly detail?: string;
}

export interface IntegrationsCheck {
  readonly googleOAuthConfigured: boolean;
  readonly zaloBotConfigured: boolean;
}

export interface DependencyChecks {
  readonly api: ApiDependencyCheck;
  readonly database: DatabaseDependencyCheck;
  readonly s3: S3DependencyCheck;
  readonly integrations: IntegrationsCheck;
}

export interface TrafficMinutePoint {
  readonly minute: string;
  readonly requests: number;
  readonly status2xx: number;
  readonly status4xx: number;
  readonly status5xx: number;
  readonly avgLatencyMs: number;
  readonly p95LatencyMs: number;
}

export interface EndpointMetricItem {
  readonly method: string;
  readonly route: string;
  readonly requests: number;
  readonly errors4xx: number;
  readonly errors5xx: number;
  readonly errorRatePercent: number;
  readonly avgLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly maxLatencyMs: number;
}

export interface RecentServerErrorItem {
  readonly id: string;
  readonly occurredAt: string;
  readonly method: string;
  readonly path: string;
  readonly statusCode: number;
  readonly message: string;
  readonly exceptionName: string;
  readonly requestId: string | null;
}

export interface TrafficSummary {
  readonly windowMinutes: 60;
  readonly inFlightRequests: number;
  readonly requestsPerMinute5m: number;
  readonly totalRequests60m: number;
  readonly status2xx60m: number;
  readonly status4xx60m: number;
  readonly status5xx60m: number;
  readonly errorRate5xxPercent: number;
  readonly avgLatencyMs60m: number;
  readonly p95LatencyMs60m: number;
  readonly points: readonly TrafficMinutePoint[];
  readonly topEndpoints: readonly EndpointMetricItem[];
  readonly recentErrors: readonly RecentServerErrorItem[];
}

export interface SystemMonitoringOverview {
  readonly generatedAt: string;
  readonly status: OverallHealthStatus;
  readonly alerts: readonly MonitoringAlert[];
  readonly runtime: RuntimeInfo;
  readonly dependencies: DependencyChecks;
  readonly cpu: CpuMetrics;
  readonly memory: MemoryMetrics;
  readonly storage: StorageMetrics;
  readonly traffic: TrafficSummary;
}

export interface PublicHealthCheck {
  readonly status: 'ok';
  readonly uptimeSeconds: number;
  readonly timestamp: string;
}
