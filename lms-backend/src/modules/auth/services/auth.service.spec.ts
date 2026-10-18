import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { UserFacade } from '../../user/facades/user.facade.js';
import { TokenService } from './token.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { GoogleAuthService, GoogleUserProfile } from './google-auth.service.js';
import { Role } from '../../../common/enums/role.enum.js';
import { UserView } from '../../user/types/user-view.type.js';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserFacade: Partial<Record<keyof UserFacade, ReturnType<typeof vi.fn>>>;
  let mockTokenService: Partial<Record<keyof TokenService, ReturnType<typeof vi.fn>>>;
  let mockRefreshTokenService: Partial<Record<keyof RefreshTokenService, ReturnType<typeof vi.fn>>>;
  let mockGoogleAuthService: Partial<Record<keyof GoogleAuthService, ReturnType<typeof vi.fn>>>;
  let mockConfigService: Partial<Record<keyof ConfigService, ReturnType<typeof vi.fn>>>;

  const sampleUserView: UserView = {
    id: 'usr-1',
    email: 'user@school.edu.vn',
    fullName: 'Nguyen Van User',
    ssoId: 'google-id-123',
    ssoProvider: 'GOOGLE',
    avatarUrl: null,
    role: Role.STUDENT,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleGoogleProfile: GoogleUserProfile = {
    googleId: 'google-id-123',
    email: 'user@school.edu.vn',
    fullName: 'Nguyen Van User',
    avatarUrl: null,
  };

  beforeEach(() => {
    mockUserFacade = {
      findBySsoId: vi.fn(),
      findByEmail: vi.fn(),
      createUser: vi.fn(),
      linkSso: vi.fn(),
      getUserById: vi.fn(),
      getProfileCode: vi.fn(),
    };
    mockTokenService = {
      generateAccessToken: vi.fn().mockReturnValue('access.token.jwt'),
    };
    mockRefreshTokenService = {
      getTtlMs: vi.fn().mockReturnValue(1209600000),
      issue: vi.fn().mockResolvedValue('refresh-token-uuid'),
      rotate: vi.fn(),
      revokeFamilyOf: vi.fn().mockResolvedValue(undefined),
    };
    mockGoogleAuthService = {
      verifyToken: vi.fn(),
    };
    mockConfigService = {
      get: vi.fn().mockReturnValue('admin@school.edu.vn,hoanggiap1803@gmail.com'),
    };

    service = new AuthService(
      mockUserFacade as unknown as UserFacade,
      mockTokenService as unknown as TokenService,
      mockRefreshTokenService as unknown as RefreshTokenService,
      mockGoogleAuthService as unknown as GoogleAuthService,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('getRefreshTtlMs', () => {
    it('returns refresh token TTL from RefreshTokenService', () => {
      expect(service.getRefreshTtlMs()).toBe(1209600000);
    });
  });

  describe('loginWithGoogle', () => {
    it('authenticates returning user found by ssoId', async () => {
      mockGoogleAuthService.verifyToken!.mockResolvedValue(sampleGoogleProfile);
      mockUserFacade.findBySsoId!.mockResolvedValue(sampleUserView);
      mockUserFacade.getProfileCode!.mockResolvedValue('SV001');

      const session = await service.loginWithGoogle('google-id-token');

      expect(mockGoogleAuthService.verifyToken).toHaveBeenCalledWith('google-id-token');
      expect(mockUserFacade.findBySsoId).toHaveBeenCalledWith('google-id-123');
      expect(mockUserFacade.createUser).not.toHaveBeenCalled();
      expect(session.accessToken).toBe('access.token.jwt');
      expect(session.refreshToken).toBe('refresh-token-uuid');
      expect(session.user.code).toBe('SV001');
    });

    it('links Google SSO to existing user found by email', async () => {
      mockGoogleAuthService.verifyToken!.mockResolvedValue(sampleGoogleProfile);
      mockUserFacade.findBySsoId!.mockResolvedValue(null);
      mockUserFacade.findByEmail!.mockResolvedValue(sampleUserView);
      mockUserFacade.linkSso!.mockResolvedValue(sampleUserView);
      mockUserFacade.getProfileCode!.mockResolvedValue('SV001');

      const session = await service.loginWithGoogle('google-id-token');

      expect(mockUserFacade.linkSso).toHaveBeenCalledWith(sampleUserView.id, {
        ssoId: 'google-id-123',
        ssoProvider: 'GOOGLE',
        avatarUrl: null,
      });
      expect(session.user.email).toBe('user@school.edu.vn');
    });

    it('creates new user with STUDENT role on first login if email is not admin', async () => {
      mockGoogleAuthService.verifyToken!.mockResolvedValue(sampleGoogleProfile);
      mockUserFacade.findBySsoId!.mockResolvedValue(null);
      mockUserFacade.findByEmail!.mockResolvedValue(null);
      mockUserFacade.createUser!.mockResolvedValue(sampleUserView);
      mockUserFacade.getProfileCode!.mockResolvedValue('SV001');

      await service.loginWithGoogle('google-id-token');

      expect(mockUserFacade.createUser).toHaveBeenCalledWith({
        email: 'user@school.edu.vn',
        fullName: 'Nguyen Van User',
        ssoId: 'google-id-123',
        ssoProvider: 'GOOGLE',
        avatarUrl: undefined,
        role: Role.STUDENT,
      });
    });

    it('creates new user with ADMIN role on first login if email is in ADMIN_EMAILS', async () => {
      const adminProfile = {
        ...sampleGoogleProfile,
        email: 'admin@school.edu.vn',
      };
      const adminUserView = {
        ...sampleUserView,
        email: 'admin@school.edu.vn',
        role: Role.ADMIN,
      };

      mockGoogleAuthService.verifyToken!.mockResolvedValue(adminProfile);
      mockUserFacade.findBySsoId!.mockResolvedValue(null);
      mockUserFacade.findByEmail!.mockResolvedValue(null);
      mockUserFacade.createUser!.mockResolvedValue(adminUserView);
      mockUserFacade.getProfileCode!.mockResolvedValue(null);

      await service.loginWithGoogle('google-id-token');

      expect(mockUserFacade.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          role: Role.ADMIN,
        }),
      );
    });
  });

  describe('refresh', () => {
    it('rotates refresh token and returns new session for active user', async () => {
      mockRefreshTokenService.rotate!.mockResolvedValue({
        userId: 'usr-1',
        refreshToken: 'new-refresh-token',
      });
      mockUserFacade.getUserById!.mockResolvedValue(sampleUserView);
      mockUserFacade.getProfileCode!.mockResolvedValue('SV001');

      const session = await service.refresh('raw-refresh-token');

      expect(mockRefreshTokenService.rotate).toHaveBeenCalledWith('raw-refresh-token');
      expect(session.accessToken).toBe('access.token.jwt');
      expect(session.refreshToken).toBe('new-refresh-token');
    });

    it('revokes token family and throws UnauthorizedException if user account is disabled', async () => {
      mockRefreshTokenService.rotate!.mockResolvedValue({
        userId: 'usr-1',
        refreshToken: 'new-refresh-token',
      });
      mockUserFacade.getUserById!.mockResolvedValue({
        ...sampleUserView,
        isActive: false,
      });

      await expect(service.refresh('raw-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRefreshTokenService.revokeFamilyOf).toHaveBeenCalledWith(
        'new-refresh-token',
      );
    });
  });

  describe('logout', () => {
    it('revokes refresh token family if token is provided', async () => {
      await service.logout('some-refresh-token');
      expect(mockRefreshTokenService.revokeFamilyOf).toHaveBeenCalledWith(
        'some-refresh-token',
      );
    });

    it('does nothing if token is undefined', async () => {
      await service.logout(undefined);
      expect(mockRefreshTokenService.revokeFamilyOf).not.toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('returns session user with profile code', async () => {
      mockUserFacade.getUserById!.mockResolvedValue(sampleUserView);
      mockUserFacade.getProfileCode!.mockResolvedValue('SV001');

      const result = await service.getMe('usr-1');

      expect(result.id).toBe('usr-1');
      expect(result.code).toBe('SV001');
    });
  });
});
