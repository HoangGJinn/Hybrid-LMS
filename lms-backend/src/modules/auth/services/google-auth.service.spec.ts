import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleAuthService } from './google-auth.service.js';

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;
  let verifySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const config = {
      get: vi.fn().mockReturnValue('google-client-id'),
    } as unknown as ConfigService;
    service = new GoogleAuthService(config);
    verifySpy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns normalized GoogleUserProfile when token and verified email are valid', async () => {
    verifySpy.mockResolvedValue({
      getPayload: () => ({
        sub: 'g-123',
        email: 'Student@School.EDU.vn',
        email_verified: true,
        name: 'Nguyen Van A',
        picture: 'https://img/a.png',
      }),
    } as never);

    const profile = await service.verifyToken('valid-token');
    expect(profile).toEqual({
      googleId: 'g-123',
      email: 'student@school.edu.vn',
      fullName: 'Nguyen Van A',
      avatarUrl: 'https://img/a.png',
    });

    verifySpy.mockResolvedValue({
      getPayload: () => ({
        sub: 'g-124',
        email: 'no-name@school.edu.vn',
        email_verified: true,
      }),
    } as never);
    expect(await service.verifyToken('valid-token-2')).toEqual({
      googleId: 'g-124',
      email: 'no-name@school.edu.vn',
      fullName: 'no-name@school.edu.vn',
      avatarUrl: null,
    });
  });

  it('throws UnauthorizedException for missing payload fields, unverified email, or SDK errors', async () => {
    verifySpy.mockResolvedValue({ getPayload: () => undefined } as never);
    await expect(service.verifyToken('bad')).rejects.toThrow(
      UnauthorizedException,
    );

    verifySpy.mockResolvedValue({
      getPayload: () => ({
        sub: 'g-1',
        email: 'a@b.com',
        email_verified: false,
      }),
    } as never);
    await expect(service.verifyToken('unverified')).rejects.toThrow(
      'Google email is not verified',
    );

    verifySpy.mockRejectedValue(new Error('Network failure'));
    await expect(service.verifyToken('error')).rejects.toThrow(
      'Invalid Google token',
    );
  });
});

