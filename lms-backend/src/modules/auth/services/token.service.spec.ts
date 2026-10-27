import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service.js';
import { UserView } from '../../user/types/user-view.type.js';
import { Role } from '../../../common/enums/role.enum.js';

describe('TokenService', () => {
  let service: TokenService;
  let mockJwtService: Partial<
    Record<keyof JwtService, ReturnType<typeof vi.fn>>
  >;

  beforeEach(() => {
    mockJwtService = {
      sign: vi.fn(),
    };
    service = new TokenService(mockJwtService as unknown as JwtService);
  });

  describe('generateAccessToken', () => {
    it('signs and returns JWT payload with user id, email, and role', () => {
      mockJwtService.sign!.mockReturnValue('signed.jwt.token');
      const user: UserView = {
        id: 'usr-123',
        email: 'user@school.edu.vn',
        fullName: 'User Name',
        ssoId: 'sso-123',
        ssoProvider: 'GOOGLE',
        avatarUrl: null,
        role: Role.STUDENT,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = service.generateAccessToken(user);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'usr-123',
        email: 'user@school.edu.vn',
        role: Role.STUDENT,
      });
      expect(token).toBe('signed.jwt.token');
    });
  });
});
