import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity.js';

const TOKEN_BYTES = 48;
const DEFAULT_REFRESH_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
/** A token revoked this recently was most likely rotated by a parallel request, not stolen. */
const REUSE_GRACE_MS = 10_000;

export interface RotatedRefreshToken {
  readonly userId: string;
  readonly refreshToken: string;
}

/** Issues, rotates and revokes refresh tokens. Every token is single-use: refreshing replaces it with a new one. */
@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly configService: ConfigService,
  ) {}

  /** Lifetime of a refresh token (and of its cookie) in milliseconds. */
  getTtlMs(): number {
    return (
      this.configService.get<number>('REFRESH_TOKEN_TTL') ??
      DEFAULT_REFRESH_TOKEN_TTL_MS
    );
  }

  /** Creates a refresh token and returns the raw value (the only time it is visible). A new login starts a new family. */
  async issue(
    userId: string,
    familyId: string = randomUUID(),
  ): Promise<string> {
    const rawToken = randomBytes(TOKEN_BYTES).toString('base64url');
    const entity = this.refreshTokenRepository.create({
      userId,
      familyId,
      tokenHash: this.hash(rawToken),
      expiresAt: new Date(Date.now() + this.getTtlMs()),
      revokedAt: null,
    });
    await this.refreshTokenRepository.save(entity);
    return rawToken;
  }

  /** Exchanges a valid token for a new one in the same family. A reused (already rotated) token revokes the whole family. */
  async rotate(rawToken: string): Promise<RotatedRefreshToken> {
    const stored = await this.refreshTokenRepository.findOneBy({
      tokenHash: this.hash(rawToken),
    });
    if (!stored) throw new UnauthorizedException('Invalid refresh token');
    await this.assertUsable(stored);
    const claimed = await this.refreshTokenRepository.update(
      { id: stored.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    if (claimed.affected !== 1)
      throw new UnauthorizedException('Refresh token already used');
    return {
      userId: stored.userId,
      refreshToken: await this.issue(stored.userId, stored.familyId),
    };
  }

  /** Revokes the whole family of a token (logout of that device). Unknown tokens are ignored. */
  async revokeFamilyOf(rawToken: string): Promise<void> {
    const stored = await this.refreshTokenRepository.findOneBy({
      tokenHash: this.hash(rawToken),
    });
    if (stored) await this.revokeFamily(stored.familyId);
  }

  private async assertUsable(stored: RefreshToken): Promise<void> {
    if (stored.revokedAt) {
      const isParallelRotation =
        Date.now() - stored.revokedAt.getTime() < REUSE_GRACE_MS;
      if (!isParallelRotation) await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Refresh token already used');
    }
    if (stored.expiresAt.getTime() <= Date.now())
      throw new UnauthorizedException('Refresh token expired');
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
