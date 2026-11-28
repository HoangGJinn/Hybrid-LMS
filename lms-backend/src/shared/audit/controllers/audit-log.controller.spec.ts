import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaginatedResult } from '../../../common/types/paginated-result.type.js';
import { AuditLogController } from './audit-log.controller.js';
import type { AuditLogService } from '../services/audit-log.service.js';
import type { AuditLogView } from '../types/audit-log-view.type.js';

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let mockService: Partial<
    Record<keyof AuditLogService, ReturnType<typeof vi.fn>>
  >;

  const sampleView = { id: 'log-1' } as AuditLogView;

  beforeEach(() => {
    mockService = {
      list: vi.fn().mockResolvedValue(PaginatedResult.of([sampleView], 1, 1, 20)),
      getRecent: vi.fn().mockResolvedValue([sampleView]),
      getById: vi.fn().mockResolvedValue(sampleView),
      exportExcel: vi.fn().mockResolvedValue({
        fileName: 'Audit-Logs-2026-11-23.xlsx',
        buffer: Buffer.from('xlsx'),
      }),
    };
    controller = new AuditLogController(mockService as unknown as AuditLogService);
  });

  it('lists audit logs', async () => {
    const query = { page: 1, limit: 20 };
    const result = await controller.list(query);

    expect(mockService.list).toHaveBeenCalledWith(query);
    expect(result.items).toEqual([sampleView]);
  });

  it('gets recent audit logs', async () => {
    const result = await controller.getRecent(8);

    expect(mockService.getRecent).toHaveBeenCalledWith(8);
    expect(result).toEqual([sampleView]);
  });

  it('gets one audit log by id', async () => {
    const result = await controller.getById('log-1');

    expect(mockService.getById).toHaveBeenCalledWith('log-1');
    expect(result).toBe(sampleView);
  });

  it('streams the exported Excel workbook', async () => {
    const response = { set: vi.fn(), end: vi.fn() } as unknown as Response;

    await controller.exportExcel({ page: 1, limit: 20 }, response);

    expect(mockService.exportExcel).toHaveBeenCalled();
    expect(response.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Disposition':
          "attachment; filename*=UTF-8''Audit-Logs-2026-11-23.xlsx",
      }),
    );
    expect(response.end).toHaveBeenCalledWith(Buffer.from('xlsx'));
  });
});
