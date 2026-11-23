import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditLog } from '../entities/audit-log.entity.js';
import { AuditAction } from '../enums/audit-action.enum.js';
import { AuditCategory } from '../enums/audit-category.enum.js';
import { AuditEntityType } from '../enums/audit-entity-type.enum.js';
import { AuditResult } from '../enums/audit-result.enum.js';
import { AuditLogRepository } from './audit-log.repository.js';

describe('AuditLogRepository', () => {
  let repository: AuditLogRepository;
  let mockRepo: Partial<
    Record<keyof Repository<AuditLog>, ReturnType<typeof vi.fn>>
  >;
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockQuery = vi.fn().mockResolvedValue([{ fullName: 'Admin User' }]);
    mockRepo = {
      insert: vi.fn().mockResolvedValue(undefined),
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
      createQueryBuilder: vi.fn(),
      manager: { query: mockQuery } as any,
    };
    repository = new AuditLogRepository(
      mockRepo as unknown as Repository<AuditLog>,
    );
  });

  it('inserts an audit log row', async () => {
    await repository.insert({ action: AuditAction.USER_CREATED });
    expect(mockRepo.insert).toHaveBeenCalledWith({
      action: AuditAction.USER_CREATED,
    });
  });

  it('looks up actor full name from users table', async () => {
    const name = await repository.findActorName('usr-1');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM users'), [
      'usr-1',
    ]);
    expect(name).toBe('Admin User');
  });

  it('applies filters, escaped search, and pagination in findPage', async () => {
    const qb = {
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
    };
    mockRepo.createQueryBuilder!.mockReturnValue(qb);

    await repository.findPage({
      category: AuditCategory.ADMIN,
      action: AuditAction.CLASS_UPDATED,
      entityType: AuditEntityType.CLASS,
      relatedId: 'cls-1',
      result: AuditResult.SUCCESS,
      search: '50%',
      page: 2,
      limit: 20,
    });

    expect(qb.andWhere).toHaveBeenCalledWith('a.category = :category', {
      category: AuditCategory.ADMIN,
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(a.entityId = :relatedId OR a.parentId = :relatedId)',
      { relatedId: 'cls-1' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(a.entityLabel ILIKE :search OR a.actorEmail ILIKE :search OR a.actorName ILIKE :search OR a.summary ILIKE :search)',
      { search: '%50\\%%' },
    );
    expect(qb.skip).toHaveBeenCalledWith(20);
    expect(qb.take).toHaveBeenCalledWith(20);
  });
});
