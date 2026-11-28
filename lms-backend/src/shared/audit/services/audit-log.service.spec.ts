import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runWithAuditContext } from '../context/audit-context.js';
import type { AuditLog } from '../entities/audit-log.entity.js';
import { AuditAction } from '../enums/audit-action.enum.js';
import { AuditCategory } from '../enums/audit-category.enum.js';
import { AuditEntityType } from '../enums/audit-entity-type.enum.js';
import { AuditResult } from '../enums/audit-result.enum.js';
import type { AuditLogRepository } from '../repositories/audit-log.repository.js';
import { AuditLogService } from './audit-log.service.js';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockRepo: Partial<
    Record<keyof AuditLogRepository, ReturnType<typeof vi.fn>>
  >;

  const sampleEntity = {
    id: 'log-1',
    occurredAt: new Date('2026-11-23T10:00:00Z'),
    actorId: 'admin-1',
    actorEmail: 'admin@school.edu.vn',
    actorName: 'Admin User',
    actorRole: 'ADMIN',
    category: AuditCategory.ADMIN,
    action: AuditAction.USER_REMOVED,
    result: AuditResult.SUCCESS,
    entityType: AuditEntityType.USER,
    entityId: 'usr-1',
    entityLabel: 'SV26000001 — Student',
    parentType: null,
    parentId: null,
    summary: 'Permanently removed student',
    changes: { isActive: { from: true, to: false } },
    metadata: { code: 'SV26000001' },
    ipAddress: '127.0.0.1',
    userAgent: 'Vitest',
    requestId: 'req-1',
  } as AuditLog;

  beforeEach(() => {
    mockRepo = {
      insert: vi.fn().mockResolvedValue(undefined),
      findActorDetails: vi.fn().mockResolvedValue({
        fullName: 'Admin User',
        email: 'admin@school.edu.vn',
        role: 'ADMIN',
      }),
      findPage: vi.fn().mockResolvedValue([[sampleEntity], 1]),
      findById: vi.fn().mockResolvedValue(sampleEntity),
      findRecent: vi.fn().mockResolvedValue([sampleEntity]),
      findForExport: vi.fn().mockResolvedValue([sampleEntity]),
    };
    service = new AuditLogService(mockRepo as unknown as AuditLogRepository);
  });

  describe('record', () => {
    it('merges AsyncLocalStorage request context and resolves missing actor fields', async () => {
      await runWithAuditContext(
        {
          actor: { id: 'admin-1' },
          ipAddress: '10.0.0.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-123',
        },
        () =>
          service.record({
            category: AuditCategory.SECURITY,
            action: AuditAction.LOGOUT,
            entityType: AuditEntityType.AUTH,
            entityId: 'admin-1',
            summary: 'User logged out',
          }),
      );

      expect(mockRepo.findActorDetails).toHaveBeenCalledWith('admin-1');
      expect(mockRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          actorEmail: 'admin@school.edu.vn',
          actorName: 'Admin User',
          actorRole: 'ADMIN',
          ipAddress: '10.0.0.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-123',
          result: AuditResult.SUCCESS,
        }),
      );
    });

    it('swallows repository errors so the primary operation never fails', async () => {
      mockRepo.insert!.mockRejectedValue(new Error('db down'));

      await expect(
        service.record({
          category: AuditCategory.ADMIN,
          action: AuditAction.USER_CREATED,
          entityType: AuditEntityType.USER,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns paginated AuditLogView results and parses date-only bounds in Vietnam timezone', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        from: '2026-11-01',
        to: '2026-11-23',
        requestId: 'req-99',
        search: '  student  ',
      });

      expect(mockRepo.findPage).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          from: new Date('2026-11-01T00:00:00.000+07:00'),
          to: new Date('2026-11-23T23:59:59.999+07:00'),
          requestId: 'req-99',
          search: 'student',
        }),
      );
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe('log-1');
    });

    it('normalizes inverted date bounds so swapped from/to still covers full days', async () => {
      await service.list({
        page: 1,
        limit: 20,
        from: '2026-11-24',
        to: '2026-11-20',
      });

      expect(mockRepo.findPage).toHaveBeenCalledWith(
        expect.objectContaining({
          from: new Date('2026-11-20T00:00:00.000+07:00'),
          to: new Date('2026-11-24T23:59:59.999+07:00'),
        }),
      );
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when log does not exist', async () => {
      mockRepo.findById!.mockResolvedValue(null);

      await expect(service.getById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRecent', () => {
    it('bounds limit between 1 and 50', async () => {
      await service.getRecent(200);
      await service.getRecent(0);

      expect(mockRepo.findRecent).toHaveBeenNthCalledWith(1, 50);
      expect(mockRepo.findRecent).toHaveBeenNthCalledWith(2, 1);
    });
  });

  describe('exportExcel', () => {
    it('builds an xlsx buffer for matching logs', async () => {
      const file = await service.exportExcel({ page: 1, limit: 20 });

      expect(file.fileName).toMatch(/^Audit-Logs-\d{4}-\d{2}-\d{2}\.xlsx$/);
      expect(file.buffer.length).toBeGreaterThan(0);
    });
  });
});
