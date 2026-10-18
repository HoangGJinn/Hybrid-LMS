import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy.js';
import { UserFacade } from '../../user/facades/user.facade.js';
import { Role } from '../../../common/enums/role.enum.js';
import { UserView } from '../../user/types/user-view.type.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockUserFacade: Partial<Record<keyof UserFacade, ReturnType<typeof vi.fn>>>;
  let mockConfigService: Partial<Record<keyof ConfigService, ReturnType<typeof vi.fn>>>;

  const sampleUserView: UserView = {
    id: 'usr-1',
    email: 'user@school.edu.vn',
    fullName: 'Test User',
    ssoId: 'sso-1',
    ssoProvider: 'GOOGLE',
    avatarUrl: null,
    role: Role.STUDENT,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserFacade = {
      getUserById: vi.fn(),
    };
    mockConfigService = {
      get: vi.fn().mockReturnValue('test-secret'),
    };
    strategy = new JwtStrategy(
      mockConfigService as unknown as ConfigService,
      mockUserFacade as unknown as UserFacade,
    );
  });

  describe('validate', () => {
    it('returns authenticated user when user exists and is active', async () => {
      mockUserFacade.getUserById!.mockResolvedValue(sampleUserView);

      const result = await strategy.validate({
        sub: 'usr-1',
        email: 'user@school.edu.vn',
        role: Role.STUDENT,
      });

      expect(mockUserFacade.getUserById).toHaveBeenCalledWith('usr-1');
      expect(result).toEqual({
        id: 'usr-1',
        email: 'user@school.edu.vn',
        role: Role.STUDENT,
      });
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      mockUserFacade.getUserById!.mockResolvedValue(null);

      await expect(
        strategy.validate({
          sub: 'unknown',
          email: 'unknown@school.edu.vn',
          role: Role.STUDENT,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      mockUserFacade.getUserById!.mockResolvedValue({
        ...sampleUserView,
        isActive: false,
      });

      await expect(
        strategy.validate({
          sub: 'usr-1',
          email: 'user@school.edu.vn',
          role: Role.STUDENT,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
