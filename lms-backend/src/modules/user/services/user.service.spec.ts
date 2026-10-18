import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { User } from '../entities/user.entity.js';
import { Role } from '../../../common/enums/role.enum.js';

describe('UserService', () => {
  let service: UserService;
  let mockUserRepo: Partial<Record<keyof UserRepository, ReturnType<typeof vi.fn>>>;

  const sampleUser: User = {
    id: 'user-uuid-1',
    email: 'user@school.edu.vn',
    fullName: 'Nguyen Van A',
    ssoId: 'google-sso-1',
    ssoProvider: 'GOOGLE',
    avatarUrl: 'https://example.com/avatar.jpg',
    role: Role.STUDENT,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepo = {
      createUserWithProfile: vi.fn(),
      findByRole: vi.fn(),
      findProfileCode: vi.fn(),
      findByEmail: vi.fn(),
      findBySsoId: vi.fn(),
      findById: vi.fn(),
      updateSsoLink: vi.fn(),
    };

    service = new UserService(mockUserRepo as unknown as UserRepository);
  });

  describe('createUser', () => {
    it('creates a user with profile through repository', async () => {
      mockUserRepo.createUserWithProfile!.mockResolvedValue(sampleUser);
      const dto = {
        email: 'user@school.edu.vn',
        fullName: 'Nguyen Van A',
        ssoId: 'google-sso-1',
        ssoProvider: 'GOOGLE',
      };

      const result = await service.createUser(dto);

      expect(mockUserRepo.createUserWithProfile).toHaveBeenCalledWith(dto);
      expect(result).toEqual(sampleUser);
    });
  });

  describe('findUsers', () => {
    it('finds users by role', async () => {
      mockUserRepo.findByRole!.mockResolvedValue([sampleUser]);

      const result = await service.findUsers(Role.STUDENT);

      expect(mockUserRepo.findByRole).toHaveBeenCalledWith(Role.STUDENT);
      expect(result).toEqual([sampleUser]);
    });
  });

  describe('getProfileCode', () => {
    it('returns student/lecturer code from repository', async () => {
      mockUserRepo.findProfileCode!.mockResolvedValue('SV2005001');

      const result = await service.getProfileCode('user-uuid-1');

      expect(mockUserRepo.findProfileCode).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toBe('SV2005001');
    });
  });

  describe('findByEmail', () => {
    it('returns user when found by email', async () => {
      mockUserRepo.findByEmail!.mockResolvedValue(sampleUser);

      const result = await service.findByEmail('user@school.edu.vn');

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('user@school.edu.vn');
      expect(result).toEqual(sampleUser);
    });

    it('returns null when user not found by email', async () => {
      mockUserRepo.findByEmail!.mockResolvedValue(null);

      const result = await service.findByEmail('unknown@school.edu.vn');

      expect(result).toBeNull();
    });
  });

  describe('findBySsoId', () => {
    it('returns user when found by ssoId', async () => {
      mockUserRepo.findBySsoId!.mockResolvedValue(sampleUser);

      const result = await service.findBySsoId('google-sso-1');

      expect(mockUserRepo.findBySsoId).toHaveBeenCalledWith('google-sso-1');
      expect(result).toEqual(sampleUser);
    });
  });

  describe('getUserById', () => {
    it('returns user when found by id', async () => {
      mockUserRepo.findById!.mockResolvedValue(sampleUser);

      const result = await service.getUserById('user-uuid-1');

      expect(mockUserRepo.findById).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toEqual(sampleUser);
    });

    it('throws NotFoundException when user not found', async () => {
      mockUserRepo.findById!.mockResolvedValue(null);

      await expect(service.getUserById('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('linkSso', () => {
    it('updates user SSO credentials', async () => {
      const updatedUser = { ...sampleUser, ssoId: 'new-google-id' };
      mockUserRepo.updateSsoLink!.mockResolvedValue(updatedUser);

      const result = await service.linkSso('user-uuid-1', {
        ssoId: 'new-google-id',
        ssoProvider: 'GOOGLE',
        avatarUrl: null,
      });

      expect(mockUserRepo.updateSsoLink).toHaveBeenCalledWith('user-uuid-1', {
        ssoId: 'new-google-id',
        ssoProvider: 'GOOGLE',
        avatarUrl: null,
      });
      expect(result).toEqual(updatedUser);
    });
  });
});
