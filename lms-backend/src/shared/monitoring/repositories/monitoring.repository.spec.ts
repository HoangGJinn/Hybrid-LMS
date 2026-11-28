import type { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileStatus } from '../../file/enums/file-status.enum.js';
import { MonitoringRepository } from './monitoring.repository.js';

describe('MonitoringRepository', () => {
  let queryMock: ReturnType<typeof vi.fn>;
  let repository: MonitoringRepository;

  beforeEach(() => {
    queryMock = vi.fn();
    repository = new MonitoringRepository({
      query: queryMock,
    } as unknown as DataSource);
  });

  it('pings PostgreSQL with SELECT 1', async () => {
    queryMock.mockResolvedValue([{ '?column?': 1 }]);
    const latency = await repository.pingDatabase();

    expect(queryMock).toHaveBeenCalledWith('SELECT 1');
    expect(latency).toBeGreaterThanOrEqual(0);
  });

  it('parses database pool, size, and file attachment metrics', async () => {
    queryMock.mockResolvedValue([
      {
        dbSizeBytes: '67108864',
        maxConnections: 100,
        activeConnections: 3,
        idleConnections: 7,
        waitingConnections: 1,
        readyFileCount: 12,
        readyFileBytes: '1048576',
        pendingFileCount: 2,
      },
    ]);

    const stats = await repository.getDatabaseAndFileStats();

    expect(queryMock).toHaveBeenCalledWith(expect.any(String), [
      FileStatus.READY,
      FileStatus.PENDING,
    ]);
    expect(stats).toMatchObject({
      dbSizeBytes: 67108864,
      maxConnections: 100,
      activeConnections: 3,
      idleConnections: 7,
      waitingConnections: 1,
      readyFileCount: 12,
      readyFileBytes: 1048576,
      pendingFileCount: 2,
    });
  });

  it('falls back to zero defaults when row is empty', async () => {
    queryMock.mockResolvedValue([]);
    const stats = await repository.getDatabaseAndFileStats();
    expect(stats).toMatchObject({
      dbSizeBytes: 0,
      maxConnections: 100,
      activeConnections: 0,
      readyFileCount: 0,
    });
  });
});
