import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type SelectQueryBuilder } from 'typeorm';
import { escapeLike } from '../../../common/utils/sql.util.js';
import { AuditLog } from '../entities/audit-log.entity.js';
import type { AuditAction } from '../enums/audit-action.enum.js';
import type { AuditCategory } from '../enums/audit-category.enum.js';
import type { AuditEntityType } from '../enums/audit-entity-type.enum.js';
import type { AuditResult } from '../enums/audit-result.enum.js';

export interface ActorDetails {
  readonly fullName: string | null;
  readonly email: string | null;
  readonly role: string | null;
}

export interface AuditLogFilters {
  readonly category?: AuditCategory;
  readonly action?: AuditAction;
  readonly entityType?: AuditEntityType;
  readonly entityId?: string;
  readonly parentId?: string;
  readonly relatedId?: string;
  readonly actorId?: string;
  readonly requestId?: string;
  readonly result?: AuditResult;
  readonly from?: Date;
  readonly to?: Date;
  readonly search?: string;
  readonly page: number;
  readonly limit: number;
}

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async insert(data: Partial<AuditLog>): Promise<void> {
    await this.repo.insert(
      data as Parameters<Repository<AuditLog>['insert']>[0],
    );
  }

  /** Reads the actor's profile fields directly so AuditModule has no dependency on UserModule. */
  async findActorDetails(userId: string): Promise<ActorDetails | null> {
    const rows = (await this.repo.manager.query(
      'SELECT full_name AS "fullName", email, role::text AS role FROM users WHERE id = $1 LIMIT 1',
      [userId],
    )) as Array<{
      fullName?: string | null;
      email?: string | null;
      role?: string | null;
    }>;
    const row = rows[0];
    if (!row) return null;
    return {
      fullName: row.fullName ?? null,
      email: row.email ?? null,
      role: row.role ?? null,
    };
  }

  async updateUserLastSeen(
    userId: string,
    lastSeenAt: Date | null,
  ): Promise<void> {
    await this.repo.manager.query(
      'UPDATE users SET last_seen_at = $1 WHERE id = $2',
      [lastSeenAt, userId],
    );
  }

  async findPage(filters: AuditLogFilters): Promise<[AuditLog[], number]> {
    const qb = this.buildFilteredQuery(filters);
    return qb
      .orderBy('a.occurredAt', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();
  }

  async findById(id: string): Promise<AuditLog | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findRecent(limit: number): Promise<AuditLog[]> {
    return this.repo.find({
      order: { occurredAt: 'DESC', id: 'DESC' },
      take: limit,
    });
  }

  async findForExport(
    filters: Omit<AuditLogFilters, 'page' | 'limit'>,
    maxRows = 10000,
  ): Promise<AuditLog[]> {
    return this.buildFilteredQuery(filters)
      .orderBy('a.occurredAt', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .take(maxRows)
      .getMany();
  }

  private buildFilteredQuery(
    filters: Omit<AuditLogFilters, 'page' | 'limit'>,
  ): SelectQueryBuilder<AuditLog> {
    const qb = this.repo.createQueryBuilder('a');
    if (filters.category) {
      qb.andWhere('a.category = :category', { category: filters.category });
    }
    if (filters.action) {
      qb.andWhere('a.action = :action', { action: filters.action });
    }
    if (filters.entityType) {
      qb.andWhere('a.entityType = :entityType', {
        entityType: filters.entityType,
      });
    }
    if (filters.entityId) {
      qb.andWhere('a.entityId = :entityId', { entityId: filters.entityId });
    }
    if (filters.parentId) {
      qb.andWhere('a.parentId = :parentId', { parentId: filters.parentId });
    }
    if (filters.relatedId) {
      qb.andWhere(
        '(a.entityId = :relatedId OR a.parentId = :relatedId)',
        { relatedId: filters.relatedId },
      );
    }
    if (filters.actorId) {
      qb.andWhere('a.actorId = :actorId', { actorId: filters.actorId });
    }
    if (filters.requestId) {
      qb.andWhere('a.requestId = :requestId', { requestId: filters.requestId });
    }
    if (filters.result) {
      qb.andWhere('a.result = :result', { result: filters.result });
    }
    if (filters.from) {
      qb.andWhere('a.occurredAt >= :from', { from: filters.from });
    }
    if (filters.to) {
      qb.andWhere('a.occurredAt <= :to', { to: filters.to });
    }
    if (filters.search) {
      qb.andWhere(
        '(a.entityLabel ILIKE :search OR a.actorEmail ILIKE :search OR a.actorName ILIKE :search OR a.summary ILIKE :search OR a.ipAddress ILIKE :search OR a.requestId ILIKE :search OR a.entityId ILIKE :search)',
        { search: `%${escapeLike(filters.search)}%` },
      );
    }
    return qb;
  }
}
