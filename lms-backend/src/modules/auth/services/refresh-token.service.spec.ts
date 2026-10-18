import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { RefreshTokenService } from './refresh-token.service.js';

const ONE_MINUTE_MS = 60_000;
const FAMILY_ID = 'family-1';
const DEFAULT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const createService = (
  found: Partial<RefreshToken> | null,
  ttlMs: number = DEFAULT_TTL_MS,
) => {
  const mockRepository = {
    findOneBy: vi.fn().mockResolvedValue(found),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
    create: vi.fn((entity: unknown) => entity),
    save: vi.fn().mockResolvedValue(undefined),
  };
  const mockConfig = {
    get: vi.fn().mockImplementation((key: string) => {
      if (key === 'REFRESH_TOKEN_TTL') return ttlMs;
      return undefined;
    }),
  };
  const service = new RefreshTokenService(
    mockRepository as unknown as Repository<RefreshToken>,
    mockConfig as unknown as ConfigService,
  );
  return { service, mockRepository };
};

const activeToken = (): Partial<RefreshToken> => ({
  id: 't1',
  userId: 'u1',
  familyId: FAMILY_ID,
  revokedAt: null,
  expiresAt: new Date(Date.now() + ONE_MINUTE_MS),
});

describe('RefreshTokenService.rotate', () => {
  it('rejects an unknown token', async () => {
    const { service } = createService(null);
    await expect(service.rotate('unknown')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an expired token', async () => {
    const { service } = createService({
      ...activeToken(),
      expiresAt: new Date(Date.now() - ONE_MINUTE_MS),
    });
    await expect(service.rotate('raw')).rejects.toThrow(UnauthorizedException);
  });

  it('revokes the whole family when an old token is reused', async () => {
    const { service, mockRepository } = createService({
      ...activeToken(),
      revokedAt: new Date(Date.now() - ONE_MINUTE_MS),
    });
    await expect(service.rotate('raw')).rejects.toThrow(UnauthorizedException);
    expect(mockRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ familyId: FAMILY_ID }),
      expect.anything(),
    );
  });

  it('does not revoke the family when the token was rotated a moment ago (parallel request)', async () => {
    const { service, mockRepository } = createService({
      ...activeToken(),
      revokedAt: new Date(),
    });
    await expect(service.rotate('raw')).rejects.toThrow(UnauthorizedException);
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('returns a new token of the same family for a valid token', async () => {
    const { service, mockRepository } = createService(activeToken());
    const actualResult = await service.rotate('raw');
    expect(actualResult.userId).toBe('u1');
    expect(actualResult.refreshToken).not.toBe('raw');
    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ familyId: FAMILY_ID }),
    );
  });
});

describe('RefreshTokenService.getTtlMs', () => {
  it('returns default 14 days in ms when no TTL is configured', () => {
    const { service } = createService(null, undefined);
    expect(service.getTtlMs()).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('uses the configured millisecond value from REFRESH_TOKEN_TTL', () => {
    const { service } = createService(null, 1209600000);
    expect(service.getTtlMs()).toBe(1209600000);
  });
});
