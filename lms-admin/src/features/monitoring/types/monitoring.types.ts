export type OverallHealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';

export type ServiceStatus = 'UP' | 'DEGRADED' | 'DOWN' | 'UNCONFIGURED';

export type RuntimeMode = 'DOCKER' | 'LINUX_HOST' | 'LOCAL_OS';

export type MemorySource =
  | 'cgroup-v2'
  | 'cgroup-v1'
  | 'proc-meminfo'
  | 'os-freemem';

export type RefreshInterval = 5000 | 15000 | 0;

export type EndpointSortBy = 'p95' | 'errors' | 'requests';

export interface MonitoringAlert {
  key: string;
  severity: 'warning' | 'critical';
  message: string;
}

export interface RuntimeInfo {
  runtimeMode: RuntimeMode;
  cgroupVersion: 'v2' | 'v1' | null;
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  environment: string;
  pid: number;
  processUptimeSeconds: number;
  hostUptimeSeconds: number;
}

export interface CpuMetrics {
  usagePercent: number;
  processPercent: number;
  hostCores: number;
  quotaCores: number | null;
  loadAvg: [number, number, number] | null;
  throttledCount: number | null;
  throttledPercent: number | null;
  eventLoopMeanMs: number;
  eventLoopP95Ms: number;
  eventLoopMaxMs: number;
}

export interface MemoryMetrics {
  usedBytes: number;
  totalBytes: number;
  availableBytes: number;
  usedPercent: number;
  source: MemorySource;
  hostTotalBytes: number;
  rssBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  heapLimitBytes: number;
  heapUsedPercent: number;
  externalBytes: number;
}

export interface StorageMetrics {
  diskTotalBytes: number;
  diskUsedBytes: number;
  diskAvailableBytes: number;
  diskUsedPercent: number;
  dbSizeBytes: number;
  s3ReadyFilesCount: number;
  s3ReadyFilesBytes: number;
  s3PendingFilesCount: number;
  logsFileCount: number;
  logsTotalBytes: number;
}

export interface ApiDependencyCheck {
  status: ServiceStatus;
  eventLoopP95Ms: number;
  inFlightRequests: number;
}

export interface DatabaseDependencyCheck {
  status: ServiceStatus;
  latencyMs: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  maxConnections: number;
  detail?: string;
}

export interface S3DependencyCheck {
  status: ServiceStatus;
  latencyMs: number;
  bucket: string;
  region: string;
  checkedAt: string;
  detail?: string;
}

export interface IntegrationsCheck {
  googleOAuthConfigured: boolean;
  zaloBotConfigured: boolean;
}

export interface DependencyChecks {
  api: ApiDependencyCheck;
  database: DatabaseDependencyCheck;
  s3: S3DependencyCheck;
  integrations: IntegrationsCheck;
}

export interface TrafficMinutePoint {
  minute: string;
  requests: number;
  status2xx: number;
  status4xx: number;
  status5xx: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export interface EndpointMetricItem {
  method: string;
  route: string;
  requests: number;
  errors4xx: number;
  errors5xx: number;
  errorRatePercent: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
}

export interface RecentServerErrorItem {
  id: string;
  occurredAt: string;
  method: string;
  path: string;
  statusCode: number;
  message: string;
  exceptionName: string;
  requestId: string | null;
}

export interface TrafficSummary {
  windowMinutes: 60;
  inFlightRequests: number;
  requestsPerMinute5m: number;
  totalRequests60m: number;
  status2xx60m: number;
  status4xx60m: number;
  status5xx60m: number;
  errorRate5xxPercent: number;
  avgLatencyMs60m: number;
  p95LatencyMs60m: number;
  points: TrafficMinutePoint[];
  topEndpoints: EndpointMetricItem[];
  recentErrors: RecentServerErrorItem[];
}

export interface SystemMonitoringOverview {
  generatedAt: string;
  status: OverallHealthStatus;
  alerts: MonitoringAlert[];
  runtime: RuntimeInfo;
  dependencies: DependencyChecks;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  storage: StorageMetrics;
  traffic: TrafficSummary;
}
