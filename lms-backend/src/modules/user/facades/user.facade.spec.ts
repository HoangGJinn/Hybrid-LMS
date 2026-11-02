import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserFacade } from './user.facade.js';
import { UserService } from '../services/user.service.js';
import { User } from '../entities/user.entity.js';
import { Role } from '../../../common/enums/role.enum.js';

describe('UserFacade', () => {
  let facade: UserFacade;
  let mockUserService: Partial<
    Record<keyof UserService, ReturnType<typeof vi.fn>>
  >;

  const sampleUser: User = {
    id: 'usr-1',
    email: 'facade@school.edu.vn',
    fullName: 'Facade User',
    ssoId: 'sso-facade-1',
    ssoProvider: 'GOOGLE',
    avatarUrl: null,
    role: Role.STUDENT,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserService = {
      createUser: vi.fn(),
      findUsers: vi.fn(),
      getProfileCode: vi.fn(),
      findByEmail: vi.fn(),
      findBySsoId: vi.fn(),
      getUserById: vi.fn(),
      findStudentsByIds: vi.fn(),
      findStudentsByCodes: vi.fn(),
      findStudentsByEmails: vi.fn(),
      searchEnrollableStudents: vi.fn(),
      claimProvisionedAccount: vi.fn(),
      findForPasswordAuth: vi.fn(),
    };
    facade = new UserFacade(mockUserService as unknown as UserService);
  });

  describe('createUser', () => {
    it('creates user and returns UserView projection', async () => {
      mockUserService.createUser!.mockResolvedValue(sampleUser);
      const dto = {
        email: 'facade@school.edu.vn',
        fullName: 'Facade User',
        ssoId: 'sso-facade-1',
        ssoProvider: 'GOOGLE',
      };

      const result = await facade.createUser(dto);

      expect(mockUserService.createUser).toHaveBeenCalledWith(dto);
      expect(result.id).toBe('usr-1');
      expect(result.email).toBe('facade@school.edu.vn');
    });
  });

  describe('findUsers', () => {
    it('returns array of UserView projections', async () => {
      mockUserService.findUsers!.mockResolvedValue([sampleUser]);

      const result = await facade.findUsers(Role.STUDENT);

      expect(mockUserService.findUsers).toHaveBeenCalledWith(Role.STUDENT);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('usr-1');
    });
  });

  describe('getProfileCode', () => {
    it('delegates to UserService', async () => {
      mockUserService.getProfileCode!.mockResolvedValue('SV2005001');

      const result = await facade.getProfileCode('usr-1');

      expect(mockUserService.getProfileCode).toHaveBeenCalledWith('usr-1');
      expect(result).toBe('SV2005001');
    });
  });

  describe('findByEmail', () => {
    it('returns UserView if user exists', async () => {
      mockUserService.findByEmail!.mockResolvedValue(sampleUser);

      const result = await facade.findByEmail('facade@school.edu.vn');

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        'facade@school.edu.vn',
      );
      expect(result?.email).toBe('facade@school.edu.vn');
    });

    it('returns null if user does not exist', async () => {
      mockUserService.findByEmail!.mockResolvedValue(null);

      const result = await facade.findByEmail('none@school.edu.vn');

      expect(result).toBeNull();
    });
  });

  describe('findBySsoId', () => {
    it('returns UserView if ssoId exists', async () => {
      mockUserService.findBySsoId!.mockResolvedValue(sampleUser);

      const result = await facade.findBySsoId('sso-facade-1');

      expect(mockUserService.findBySsoId).toHaveBeenCalledWith('sso-facade-1');
      expect(result?.id).toBe(sampleUser.id);
    });

    it('returns null if ssoId does not exist', async () => {
      mockUserService.findBySsoId!.mockResolvedValue(null);

      const result = await facade.findBySsoId('unknown-sso');

      expect(result).toBeNull();
    });
  });

  describe('findForPasswordAuth', () => {
    it('delegates to userService.findForPasswordAuth', async () => {
      const mockResult = {
        user: { ...sampleUser },
        passwordHash: 'some-hash',
      };
      mockUserService.findForPasswordAuth!.mockResolvedValue(mockResult);

      const result = await facade.findForPasswordAuth('student1');

      expect(mockUserService.findForPasswordAuth).toHaveBeenCalledWith('student1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('getUserById', () => {
    it('returns UserView projection', async () => {
      mockUserService.getUserById!.mockResolvedValue(sampleUser);

      const result = await facade.getUserById('usr-1');

      expect(mockUserService.getUserById).toHaveBeenCalledWith('usr-1');
      expect(result.id).toBe('usr-1');
    });
  });

  describe('claimProvisionedAccount', () => {
    const account = {
      ssoId: 'new-sso',
      ssoProvider: 'GOOGLE',
      avatarUrl: null,
      fullName: 'Facade User',
    };

    it('returns the updated UserView after the Google identity is bound', async () => {
      const claimed = { ...sampleUser, ssoId: 'new-sso' };
      mockUserService.claimProvisionedAccount!.mockResolvedValue(claimed);

      const result = await facade.claimProvisionedAccount('usr-1', account);

      expect(mockUserService.claimProvisionedAccount).toHaveBeenCalledWith(
        'usr-1',
        account,
      );
      expect(result?.id).toBe(sampleUser.id);
    });

    it('returns null when the account is already linked to a Google account', async () => {
      mockUserService.claimProvisionedAccount!.mockResolvedValue(null);

      const result = await facade.claimProvisionedAccount('usr-1', account);

      expect(result).toBeNull();
    });
  });

  describe('student lookups', () => {
    it('delegates lookup by id, code, email and search to userService', async () => {
      const summaries = [{ userId: 'usr-1' } as any];
      mockUserService.findStudentsByIds!.mockResolvedValue(summaries);
      mockUserService.findStudentsByCodes!.mockResolvedValue(summaries);
      mockUserService.findStudentsByEmails!.mockResolvedValue(summaries);
      mockUserService.searchEnrollableStudents!.mockResolvedValue(summaries);

      expect(await facade.findStudentsByIds(['usr-1'])).toEqual(summaries);
      expect(await facade.findStudentsByCodes(['SV26000001'])).toEqual(summaries);
      expect(await facade.findStudentsByEmails(['a@school.edu.vn'])).toEqual(summaries);
      expect(await facade.searchEnrollableStudents('text', 10)).toEqual(summaries);
    });
  });
});
