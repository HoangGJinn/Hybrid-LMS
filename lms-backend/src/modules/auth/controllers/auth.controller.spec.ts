import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import { Role } from '../../../common/enums/role.enum.js';
import {
  ADMIN_REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from '../constants/refresh-cookie-name.constant.js';
import { SessionUser } from '../types/session-user.type.js';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<
    Record<keyof AuthService, ReturnType<typeof vi.fn>>
  >;
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
      loginWithCredentials: vi.fn(),
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

      expect(mockAuthService.loginWithGoogle).toHaveBeenCalledWith(
        'google.id.token',
        [Role.STUDENT, Role.LECTURER],
      );
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

  describe('login', () => {
    it('authenticates user with credentials and sets httpOnly refresh cookie', async () => {
      mockAuthService.loginWithCredentials!.mockResolvedValue({
        accessToken: 'access.jwt',
        refreshToken: 'refresh.uuid',
        user: sampleSessionUser,
      });

      const result = await controller.login(
        { username: 'student1', password: 'admine123456' },
        mockResponse as unknown as Response,
      );

      expect(mockAuthService.loginWithCredentials).toHaveBeenCalledWith(
        {
          username: 'student1',
          password: 'admine123456',
        },
        [Role.STUDENT, Role.LECTURER],
      );
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

  describe('admin origin cookie isolation', () => {
    it('sets admin_refresh_token when loginWithGoogle originates from ADMIN_URL', async () => {
      const originalAdminUrl = process.env.ADMIN_URL;
      process.env.ADMIN_URL = 'https://admin.adalms.tech';
      try {
        mockAuthService.loginWithGoogle!.mockResolvedValue({
          accessToken: 'admin.jwt',
          refreshToken: 'admin.refresh.uuid',
          user: { ...sampleSessionUser, role: Role.ADMIN },
        });
        const mockReq = {
          headers: { origin: 'https://admin.adalms.tech' },
        } as unknown as Request;

        await controller.loginWithGoogle(
          { idToken: 'google.id.token' },
          mockResponse as unknown as Response,
          mockReq,
        );

        expect(mockResponse.cookie).toHaveBeenCalledWith(
          ADMIN_REFRESH_COOKIE_NAME,
          'admin.refresh.uuid',
          expect.objectContaining({ httpOnly: true }),
        );
      } finally {
        if (originalAdminUrl === undefined) delete process.env.ADMIN_URL;
        else process.env.ADMIN_URL = originalAdminUrl;
      }
    });

    it('sets admin_refresh_token when login originates from localhost:3001', async () => {
      mockAuthService.loginWithCredentials!.mockResolvedValue({
        accessToken: 'admin.jwt',
        refreshToken: 'admin.refresh.uuid',
        user: { ...sampleSessionUser, role: Role.ADMIN },
      });
      const mockReq = {
        headers: { origin: 'http://localhost:3001' },
      } as unknown as Request;

      await controller.login(
        { username: 'admin1', password: 'password123' },
        mockResponse as unknown as Response,
        mockReq,
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        ADMIN_REFRESH_COOKIE_NAME,
        'admin.refresh.uuid',
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('reads and rotates only admin_refresh_token on refresh from ADMIN_URL', async () => {
      const originalAdminUrl = process.env.ADMIN_URL;
      process.env.ADMIN_URL = 'https://admin.adalms.tech';
      try {
        const mockReq = {
          cookies: {
            [REFRESH_COOKIE_NAME]: 'lecturer.refresh.token',
            [ADMIN_REFRESH_COOKIE_NAME]: 'admin.refresh.token',
          },
          headers: { origin: 'https://admin.adalms.tech' },
        } as unknown as Request;
        mockAuthService.refresh!.mockResolvedValue({
          accessToken: 'new.admin.jwt',
          refreshToken: 'new.admin.refresh',
          user: { ...sampleSessionUser, role: Role.ADMIN },
        });

        const result = await controller.refresh(
          mockReq,
          mockResponse as unknown as Response,
        );

        expect(mockAuthService.refresh).toHaveBeenCalledWith(
          'admin.refresh.token',
        );
        expect(mockResponse.cookie).toHaveBeenCalledWith(
          ADMIN_REFRESH_COOKIE_NAME,
          'new.admin.refresh',
          expect.objectContaining({ httpOnly: true }),
        );
        expect(result).toEqual({ accessToken: 'new.admin.jwt' });
      } finally {
        if (originalAdminUrl === undefined) delete process.env.ADMIN_URL;
        else process.env.ADMIN_URL = originalAdminUrl;
      }
    });

    it('revokes and clears only admin_refresh_token on logout from ADMIN_URL', async () => {
      const originalAdminUrl = process.env.ADMIN_URL;
      process.env.ADMIN_URL = 'https://admin.adalms.tech';
      try {
        const mockReq = {
          cookies: {
            [REFRESH_COOKIE_NAME]: 'lecturer.refresh.token',
            [ADMIN_REFRESH_COOKIE_NAME]: 'admin.refresh.token',
          },
          headers: { origin: 'https://admin.adalms.tech' },
        } as unknown as Request;
        mockAuthService.logout!.mockResolvedValue(undefined);

        await controller.logout(mockReq, mockResponse as unknown as Response);

        expect(mockAuthService.logout).toHaveBeenCalledWith(
          'admin.refresh.token',
        );
        expect(mockResponse.clearCookie).toHaveBeenCalledWith(
          ADMIN_REFRESH_COOKIE_NAME,
          expect.anything(),
        );
      } finally {
        if (originalAdminUrl === undefined) delete process.env.ADMIN_URL;
        else process.env.ADMIN_URL = originalAdminUrl;
      }
    });

    it('passes ADMIN-only role restriction to AuthService when logging in from ADMIN_URL', async () => {
      const originalAdminUrl = process.env.ADMIN_URL;
      process.env.ADMIN_URL = 'https://admin.adalms.tech';
      try {
        mockAuthService.loginWithGoogle!.mockResolvedValue({
          accessToken: 'admin.jwt',
          refreshToken: 'admin.refresh.uuid',
          user: { ...sampleSessionUser, role: Role.ADMIN },
        });
        const mockReq = {
          headers: { origin: 'https://admin.adalms.tech' },
        } as unknown as Request;

        await controller.loginWithGoogle(
          { idToken: 'google.id.token' },
          mockResponse as unknown as Response,
          mockReq,
        );

        expect(mockAuthService.loginWithGoogle).toHaveBeenCalledWith(
          'google.id.token',
          [Role.ADMIN],
        );
      } finally {
        if (originalAdminUrl === undefined) delete process.env.ADMIN_URL;
        else process.env.ADMIN_URL = originalAdminUrl;
      }
    });
  });
});
