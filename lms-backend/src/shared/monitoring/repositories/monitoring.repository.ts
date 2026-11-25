import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FileStatus } from '../../file/enums/file-status.enum.js';

export interface DatabaseAndFileStats {
  readonly latencyMs: number;
  readonly dbSizeBytes: number;
  readonly maxConnections: number;
  readonly activeConnections: number;
  readonly idleConnections: number;
  readonly waitingConnections: number;
  readonly readyFileCount: number;
  readonly readyFileBytes: number;
  readonly pendingFileCount: number;
}

@Injectable()
export class MonitoringRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async pingDatabase(): Promise<number> {
    const startedAt = performance.now();
    await this.dataSource.query('SELECT 1');
    return Math.round(performance.now() - startedAt);
  }

  async getDatabaseAndFileStats(): Promise<DatabaseAndFileStats> {
    const startedAt = performance.now();
    const rows = (await this.dataSource.query(
      `SELECT
        pg_database_size(current_database())::text AS "dbSizeBytes",
        current_setting('max_connections')::int AS "maxConnections",
        (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database() AND state = 'active')::int AS "activeConnections",
        (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database() AND state = 'idle')::int AS "idleConnections",
        (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type IS NOT NULL AND state = 'active')::int AS "waitingConnections",
        (SELECT COUNT(*) FROM file_attachments WHERE status = $1)::int AS "readyFileCount",
        (SELECT COALESCE(SUM(file_size), 0) FROM file_attachments WHERE status = $1)::text AS "readyFileBytes",
        (SELECT COUNT(*) FROM file_attachments WHERE status = $2)::int AS "pendingFileCount"`,
      [FileStatus.READY, FileStatus.PENDING],
    )) as Array<{
      dbSizeBytes?: string;
      maxConnections?: number;
      activeConnections?: number;
      idleConnections?: number;
      waitingConnections?: number;
      readyFileCount?: number;
      readyFileBytes?: string;
      pendingFileCount?: number;
    }>;

    const latencyMs = Math.round(performance.now() - startedAt);
    const row = rows[0] ?? {};
    return {
      latencyMs,
      dbSizeBytes: Number(row.dbSizeBytes ?? 0),
      maxConnections: Number(row.maxConnections ?? 100),
      activeConnections: Number(row.activeConnections ?? 0),
      idleConnections: Number(row.idleConnections ?? 0),
      waitingConnections: Number(row.waitingConnections ?? 0),
      readyFileCount: Number(row.readyFileCount ?? 0),
      readyFileBytes: Number(row.readyFileBytes ?? 0),
      pendingFileCount: Number(row.pendingFileCount ?? 0),
    };
  }
}
