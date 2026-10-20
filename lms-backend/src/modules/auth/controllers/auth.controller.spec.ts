import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import { Role } from '../../../common/enums/role.enum.js';
import { REFRESH_COOKIE_NAME } from '../constants/refresh-cookie-name.constant.js';
import { SessionUser } from '../types/session-user.type.js';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<Record<keyof AuthService, ReturnType<typeof vi.fn>>>;
  let mockResponse: Partial<Record<keyof Response, ReturnType<typeof vi.fn>>>;

  const sampleSessionUser: SessionUser = {
    id: 'usr-1',
    email: 'user@school.edu.vn',
    fullName: 'Test User',
    avatarUrl: null,
    role: Role.STUDENT,
    isActive: true,
    code: 'SV001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockAuthService = {
      loginWithGoogle: vi.fn(),
      refresh: vi.fn(),
      getMe: vi.fn(),
      logout: vi.fn(),
      getRefreshTtlMs: vi.fn().mockReturnValue(1209600000),
    };
    mockResponse = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    };
    controller = new AuthController(mockAuthService as unknown as AuthService);
  });

  describe('test', () => {
    it('returns OK string', () => {
      expect(controller.test()).toBe('Auth module OK');
    });
  });

  describe('loginWithGoogle', () => {
    it('authenticates user and sets httpOnly refresh cookie', async () => {
      mockAuthService.loginWithGoogle!.mockResolvedValue({
        accessToken: 'access.jwt',
        refreshToken: 'refresh.uuid',
        user: sampleSessionUser,
      });

      const result = await controller.loginWithGoogle(
        { idToken: 'google.id.token' },
        mockResponse as unknown as Response,
      );

      expect(mockAuthService.loginWithGoogle).toHaveBeenCalledWith('google.id.token');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        'refresh.uuid',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({
        accessToken: 'access.jwt',
        user: sampleSessionUser,
      });
    });
  });

  describe('refresh', () => {
    it('rotates refresh token and sets new cookie', async () => {
      const mockReq = {
        cookies: {
          [REFRESH_COOKIE_NAME]: 'old.refresh.token',
        },
        headers: {},
      } as unknown as Request;

      mockAuthService.refresh!.mockResolvedValue({
        accessToken: 'new.access.jwt',
        refreshToken: 'new.refresh.token',
        user: sampleSessionUser,
      });

      const result = await controller.refresh(
        mockReq,
        mockResponse as unknown as Response,
      );

      expect(mockAuthService.refresh).toHaveBeenCalledWith('old.refresh.token');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        'new.refresh.token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ accessToken: 'new.access.jwt' });
    });

    it('throws UnauthorizedException if refresh cookie is missing', async () => {
      const mockReq = { cookies: {}, headers: {} } as unknown as Request;

      await expect(
        controller.refresh(mockReq, mockResponse as unknown as Response),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('clears cookie when refresh fails', async () => {
      const mockReq = {
        cookies: {
          [REFRESH_COOKIE_NAME]: 'expired.token',
        },
        headers: {},
      } as unknown as Request;

      mockAuthService.refresh!.mockRejectedValue(
        new UnauthorizedException('Expired token'),
      );

      await expect(
        controller.refresh(mockReq, mockResponse as unknown as Response),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        expect.anything(),
      );
    });
  });

  describe('getMe', () => {
    it('returns session profile for current user', async () => {
      mockAuthService.getMe!.mockResolvedValue(sampleSessionUser);

      const result = await controller.getMe({
        id: 'usr-1',
        email: 'user@school.edu.vn',
        role: Role.STUDENT,
      });

      expect(mockAuthService.getMe).toHaveBeenCalledWith('usr-1');
      expect(result).toEqual(sampleSessionUser);
    });
  });

  describe('logout', () => {
    it('revokes refresh token and clears cookie', async () => {
      const mockReq = {
        cookies: {
          [REFRESH_COOKIE_NAME]: 'token.to.revoke',
        },
        headers: {},
      } as unknown as Request;

      mockAuthService.logout!.mockResolvedValue(undefined);

      const result = await controller.logout(
        mockReq,
        mockResponse as unknown as Response,
      );

      expect(mockAuthService.logout).toHaveBeenCalledWith('token.to.revoke');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        expect.anything(),
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('rejects logout from untrusted origin when REFRESH_COOKIE_SAME_SITE is none', async () => {
      const originalEnv = process.env.REFRESH_COOKIE_SAME_SITE;
      const originalFrontendUrl = process.env.FRONTEND_URL;
      process.env.REFRESH_COOKIE_SAME_SITE = 'none';
      process.env.FRONTEND_URL = 'http://trusted.com';

      try {
        const mockReq = {
          cookies: { [REFRESH_COOKIE_NAME]: 'token' },
          headers: { origin: 'http://malicious.com' },
        } as unknown as Request;

        await expect(
          controller.logout(mockReq, mockResponse as unknown as Response),
        ).rejects.toThrow();
      } finally {
        process.env.REFRESH_COOKIE_SAME_SITE = originalEnv;
        process.env.FRONTEND_URL = originalFrontendUrl;
      }
    });

    it('allows logout from trusted origin when REFRESH_COOKIE_SAME_SITE is none', async () => {
      const originalEnv = process.env.REFRESH_COOKIE_SAME_SITE;
      const originalFrontendUrl = process.env.FRONTEND_URL;
      process.env.REFRESH_COOKIE_SAME_SITE = 'none';
      process.env.FRONTEND_URL = 'http://trusted.com';

      try {
        const mockReq = {
          cookies: { [REFRESH_COOKIE_NAME]: 'token' },
          headers: { origin: 'http://trusted.com' },
        } as unknown as Request;

        mockAuthService.logout!.mockResolvedValue(undefined);

        const result = await controller.logout(
          mockReq,
          mockResponse as unknown as Response,
        );
        expect(result).toEqual({ message: 'Logged out successfully' });
      } finally {
        process.env.REFRESH_COOKIE_SAME_SITE = originalEnv;
        process.env.FRONTEND_URL = originalFrontendUrl;
      }
    });
  });
});
