import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditLogRepository } from '../repositories/audit-log.repository.js';
import { PRESENCE_THROTTLE_MS, PresenceService } from './presence.service.js';

describe('PresenceService', () => {
  let service: PresenceService;
  let mockRepo: Partial<
    Record<keyof AuditLogRepository, ReturnType<typeof vi.fn>>
  >;

  beforeEach(() => {
    mockRepo = {
      updateUserLastSeen: vi.fn().mockResolvedValue(undefined),
    };
    service = new PresenceService(mockRepo as unknown as AuditLogRepository);
  });

  it('throttles DB updates per user within 60 seconds', async () => {
    const t0 = new Date('2026-11-23T10:00:00Z');
    const t1 = new Date(t0.getTime() + 15_000);
    const t2 = new Date(t0.getTime() + PRESENCE_THROTTLE_MS + 1000);

    await service.touch('usr-1', t0);
    await service.touch('usr-1', t1);
    await service.touch('usr-1', t2);

    expect(mockRepo.updateUserLastSeen).toHaveBeenCalledTimes(2);
    expect(mockRepo.updateUserLastSeen).toHaveBeenNthCalledWith(1, 'usr-1', t0);
    expect(mockRepo.updateUserLastSeen).toHaveBeenNthCalledWith(2, 'usr-1', t2);
  });

  it('marks online immediately even if touched recently, and marks offline with null', async () => {
    const t0 = new Date('2026-11-23T10:00:00Z');
    const t1 = new Date('2026-11-23T10:00:05Z');

    await service.touch('usr-1', t0);
    await service.markOnline('usr-1', t1);
    await service.markOffline('usr-1');

    expect(mockRepo.updateUserLastSeen).toHaveBeenNthCalledWith(2, 'usr-1', t1);
    expect(mockRepo.updateUserLastSeen).toHaveBeenNthCalledWith(3, 'usr-1', null);
  });
});
