import { Injectable, Logger } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log.repository.js';

export const PRESENCE_THROTTLE_MS = 60_000;

/**
 * Tracks authenticated user activity (`users.last_seen_at`) with a 60s per-user
 * in-memory throttle so normal API traffic does not trigger redundant DB writes.
 */
@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly lastWriteByUser = new Map<string, number>();

  constructor(private readonly auditRepo: AuditLogRepository) {}

  async touch(userId: string, now: Date = new Date()): Promise<void> {
    const nowMs = now.getTime();
    const lastMs = this.lastWriteByUser.get(userId) ?? 0;
    if (nowMs - lastMs < PRESENCE_THROTTLE_MS) return;

    this.lastWriteByUser.set(userId, nowMs);
    await this.persistLastSeen(userId, now);
  }

  async markOnline(userId: string, now: Date = new Date()): Promise<void> {
    this.lastWriteByUser.set(userId, now.getTime());
    await this.persistLastSeen(userId, now);
  }

  async markOffline(userId: string): Promise<void> {
    this.lastWriteByUser.delete(userId);
    await this.persistLastSeen(userId, null);
  }

  private async persistLastSeen(
    userId: string,
    lastSeenAt: Date | null,
  ): Promise<void> {
    try {
      await this.auditRepo.updateUserLastSeen(userId, lastSeenAt);
    } catch (error) {
      this.logger.warn(
        `Failed to update presence for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
