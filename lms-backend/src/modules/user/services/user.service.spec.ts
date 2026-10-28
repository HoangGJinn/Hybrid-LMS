import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { UserService } from './user.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { User } from '../entities/user.entity.js';
import { Role } from '../../../common/enums/role.enum.js';

describe('UserService', () => {
  let service: UserService;
  let mockUserRepo: Partial<
    Record<keyof UserRepository, ReturnType<typeof vi.fn>>
  >;

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
      findStudentsByIds: vi.fn(),
      findStudentsByCodes: vi.fn(),
      findStudentsByEmails: vi.fn(),
      searchEnrollableStudents: vi.fn(),
      createProvisionedUser: vi.fn(),
      claimSso: vi.fn(),
      findPage: vi.fn(),
      findProfiles: vi.fn().mockResolvedValue(new Map()),
      findProfile: vi.fn().mockResolvedValue(null),
      updateUserAndProfile: vi.fn(),
      setActive: vi.fn(),
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

    const firstLoginDto = {
      email: 'user@school.edu.vn',
      fullName: 'Nguyen Van A',
      ssoId: 'google-sso-1',
      ssoProvider: 'GOOGLE',
    };

    it('returns the account a parallel first login of the same Google account just created', async () => {
      mockUserRepo.createUserWithProfile!.mockRejectedValue(uniqueViolation());
      mockUserRepo.findBySsoId!.mockResolvedValue(sampleUser);

      const result = await service.createUser(firstLoginDto);

      expect(mockUserRepo.findBySsoId).toHaveBeenCalledWith('google-sso-1');
      expect(result).toEqual(sampleUser);
    });

    it('reports a conflict when the email is taken by another account', async () => {
      mockUserRepo.createUserWithProfile!.mockRejectedValue(uniqueViolation());
      mockUserRepo.findBySsoId!.mockResolvedValue(null);

      await expect(service.createUser(firstLoginDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows other database errors', async () => {
      mockUserRepo.createUserWithProfile!.mockRejectedValue(
        new Error('db down'),
      );

      await expect(service.createUser(firstLoginDto)).rejects.toThrow(
        'db down',
      );
      expect(mockUserRepo.findBySsoId).not.toHaveBeenCalled();
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

  describe('student summaries', () => {
    const studentEntity = {
      userId: 'user-uuid-1',
      studentCode: 'SV26000001',
      status: 'STUDYING',
      user: { fullName: 'Nguyen Van A', email: 'user@school.edu.vn', isActive: true },
    };

    it('maps students found by id, code, email or search to summaries', async () => {
      mockUserRepo.findStudentsByIds!.mockResolvedValue([studentEntity]);
      mockUserRepo.findStudentsByCodes!.mockResolvedValue([studentEntity]);
      mockUserRepo.findStudentsByEmails!.mockResolvedValue([studentEntity]);
      mockUserRepo.searchEnrollableStudents!.mockResolvedValue([studentEntity]);

      const results = await Promise.all([
        service.findStudentsByIds(['user-uuid-1']),
        service.findStudentsByCodes(['SV26000001']),
        service.findStudentsByEmails(['user@school.edu.vn']),
        service.searchEnrollableStudents('nguyen', 20),
      ]);

      for (const [summary] of results) {
        expect(summary).toMatchObject({
          userId: 'user-uuid-1',
          studentCode: 'SV26000001',
          fullName: 'Nguyen Van A',
          email: 'user@school.edu.vn',
          enrollmentBlockedReason: null,
        });
      }
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

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(
        'user@school.edu.vn',
      );
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

  // A lecturer an admin created in advance: no Google identity yet, placeholder name.
  const provisionedLecturer: User = {
    ...sampleUser,
    id: 'user-uuid-2',
    email: 'lecturer@school.edu.vn',
    fullName: 'lecturer',
    ssoId: null,
    ssoProvider: null,
    avatarUrl: null,
    role: Role.LECTURER,
  };

  const googleAccount = {
    ssoId: 'google-123',
    ssoProvider: 'GOOGLE',
    avatarUrl: 'https://example.com/g.jpg',
    fullName: 'Nguyen Van A',
  };

  const uniqueViolation = () =>
    new QueryFailedError(
      'INSERT',
      [],
      Object.assign(new Error('duplicate key'), { code: '23505' }),
    );

  const uniqueViolationOn = (detail: string) =>
    new QueryFailedError(
      'INSERT',
      [],
      Object.assign(new Error('duplicate key'), { code: '23505', detail }),
    );


  describe('claimProvisionedAccount', () => {
    it('binds the Google identity and takes the Google name when the admin typed none', async () => {
      mockUserRepo.findById!.mockResolvedValue(provisionedLecturer);
      mockUserRepo.claimSso!.mockResolvedValue({
        ...provisionedLecturer,
        ssoId: 'google-123',
      });

      const result = await service.claimProvisionedAccount(
        'user-uuid-2',
        googleAccount,
      );

      expect(mockUserRepo.claimSso).toHaveBeenCalledWith('user-uuid-2', {
        ssoId: 'google-123',
        ssoProvider: 'GOOGLE',
        avatarUrl: 'https://example.com/g.jpg',
        fullName: 'Nguyen Van A',
      });
      expect(result?.role).toBe(Role.LECTURER);
    });

    it('keeps the name the admin typed', async () => {
      mockUserRepo.findById!.mockResolvedValue({
        ...provisionedLecturer,
        fullName: 'Pham Van C',
      });
      mockUserRepo.claimSso!.mockResolvedValue(provisionedLecturer);

      await service.claimProvisionedAccount('user-uuid-2', googleAccount);

      expect(mockUserRepo.claimSso).toHaveBeenCalledWith(
        'user-uuid-2',
        expect.objectContaining({ fullName: undefined }),
      );
    });

    it('returns null for an account already linked to a Google account', async () => {
      mockUserRepo.findById!.mockResolvedValue(sampleUser);

      const result = await service.claimProvisionedAccount(
        'user-uuid-1',
        googleAccount,
      );

      expect(result).toBeNull();
      expect(mockUserRepo.claimSso).not.toHaveBeenCalled();
    });

    it('still succeeds when the claim was won by a parallel login of the same Google account', async () => {
      const claimedByUs = { ...provisionedLecturer, ssoId: 'google-123' };
      mockUserRepo.findById!
        .mockResolvedValueOnce(provisionedLecturer) // before the claim
        .mockResolvedValueOnce(claimedByUs); // after losing it
      mockUserRepo.claimSso!.mockResolvedValue(null);

      expect(
        await service.claimProvisionedAccount('user-uuid-2', googleAccount),
      ).toEqual(claimedByUs);
    });

    it('returns null when another login claimed the account first', async () => {
      mockUserRepo.findById!.mockResolvedValue(provisionedLecturer);
      mockUserRepo.claimSso!.mockResolvedValue(null);

      expect(
        await service.claimProvisionedAccount('user-uuid-2', googleAccount),
      ).toBeNull();
    });
  });

  describe('createManagedUser', () => {
    it('creates a LECTURER with a lowercase email and a name derived from it', async () => {
      mockUserRepo.findByEmail!.mockResolvedValue(null);
      mockUserRepo.createProvisionedUser!.mockResolvedValue(
        provisionedLecturer,
      );

      await service.createManagedUser({ email: ' Lecturer@School.edu.vn ' });

      expect(mockUserRepo.createProvisionedUser).toHaveBeenCalledWith({
        email: 'lecturer@school.edu.vn',
        fullName: 'lecturer',
        role: Role.LECTURER,
        code: undefined,
      });
    });

    it('keeps the name, role and code the admin provided', async () => {
      mockUserRepo.findByEmail!.mockResolvedValue(null);
      mockUserRepo.createProvisionedUser!.mockResolvedValue(sampleUser);

      await service.createManagedUser({
        email: 'a@school.edu.vn',
        fullName: 'Tran Thi B',
        role: Role.STUDENT,
        code: 'SV001',
      });

      expect(mockUserRepo.createProvisionedUser).toHaveBeenCalledWith({
        email: 'a@school.edu.vn',
        fullName: 'Tran Thi B',
        role: Role.STUDENT,
        code: 'SV001',
      });
    });

    it('returns the view with the profile code and a pending flag', async () => {
      mockUserRepo.findByEmail!.mockResolvedValue(null);
      mockUserRepo.createProvisionedUser!.mockResolvedValue(
        provisionedLecturer,
      );
      mockUserRepo.findProfile!.mockResolvedValue({
        code: 'GV123456789',
        status: 'WORKING',
      });

      const view = await service.createManagedUser({
        email: 'lecturer@school.edu.vn',
      });

      expect(view).toMatchObject({
        code: 'GV123456789',
        profileStatus: 'WORKING',
        hasLoggedIn: false,
        role: Role.LECTURER,
      });
    });

    it('rejects an email that already exists', async () => {
      mockUserRepo.findByEmail!.mockResolvedValue(sampleUser);

      await expect(
        service.createManagedUser({ email: 'user@school.edu.vn' }),
      ).rejects.toThrow(ConflictException);
      expect(mockUserRepo.createProvisionedUser).not.toHaveBeenCalled();
    });

    it('turns a database unique violation (race or taken code) into a conflict', async () => {
      mockUserRepo.findByEmail!.mockResolvedValue(null);
      mockUserRepo.createProvisionedUser!.mockRejectedValue(uniqueViolation());

      await expect(
        service.createManagedUser({ email: 'new@school.edu.vn' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a student code that starts with GV', async () => {
      mockUserRepo.findByEmail!.mockResolvedValue(null);

      await expect(
        service.createManagedUser({
          email: 'a@school.edu.vn',
          role: Role.STUDENT,
          code: 'GV26000001',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockUserRepo.createProvisionedUser).not.toHaveBeenCalled();
    });

    it('rejects a lecturer code that starts with SV (lecturer is the default role)', async () => {
      mockUserRepo.findByEmail!.mockResolvedValue(null);

      await expect(
        service.createManagedUser({
          email: 'a@school.edu.vn',
          code: 'SV26000001',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockUserRepo.createProvisionedUser).not.toHaveBeenCalled();
    });

    it('names the email field when the email already exists', async () => {
      mockUserRepo.findByEmail!.mockResolvedValue(sampleUser);

      const error = await service
        .createManagedUser({ email: 'user@school.edu.vn' })
        .catch((e: unknown) => e);

      expect((error as ConflictException).getResponse()).toMatchObject({
        field: 'email',
      });
    });

    it('names the code field when the database says the code is taken', async () => {
      mockUserRepo.findByEmail!.mockResolvedValue(null);
      mockUserRepo.createProvisionedUser!.mockRejectedValue(
        uniqueViolationOn('Key (lecturer_code)=(GV26000001) already exists.'),
      );

      const error = await service
        .createManagedUser({ email: 'new@school.edu.vn', code: 'GV26000001' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        field: 'code',
      });
    });

    it('names the email field when a race on the email is lost', async () => {
      mockUserRepo.findByEmail!.mockResolvedValue(null);
      mockUserRepo.createProvisionedUser!.mockRejectedValue(
        uniqueViolationOn('Key (email)=(new@school.edu.vn) already exists.'),
      );

      const error = await service
        .createManagedUser({ email: 'new@school.edu.vn' })
        .catch((e: unknown) => e);

      expect((error as ConflictException).getResponse()).toMatchObject({
        field: 'email',
      });
    });

    it('rethrows unexpected errors', async () => {
      mockUserRepo.findByEmail!.mockResolvedValue(null);
      mockUserRepo.createProvisionedUser!.mockRejectedValue(
        new Error('db down'),
      );

      await expect(
        service.createManagedUser({ email: 'new@school.edu.vn' }),
      ).rejects.toThrow('db down');
    });
  });

  describe('listUsers', () => {
    it('returns the page with profile data and pagination info', async () => {
      mockUserRepo.findPage!.mockResolvedValue([[provisionedLecturer], 45]);
      mockUserRepo.findProfiles!.mockResolvedValue(
        new Map([['user-uuid-2', { code: 'GV01', status: 'WORKING' }]]),
      );

      const result = await service.listUsers({
        page: 2,
        limit: 20,
        role: Role.LECTURER,
        search: 'lect',
      });

      expect(mockUserRepo.findPage).toHaveBeenCalledWith({
        role: Role.LECTURER,
        isActive: undefined,
        search: 'lect',
        page: 2,
        limit: 20,
      });
      expect(result.total).toBe(45);
      expect(result.totalPages).toBe(3);
      expect(result.items[0]).toMatchObject({
        code: 'GV01',
        profileStatus: 'WORKING',
        hasLoggedIn: false,
      });
    });

    it('passes the signed-in filter (pending accounts) to the repository', async () => {
      mockUserRepo.findPage!.mockResolvedValue([[], 0]);

      await service.listUsers({
        page: 1,
        limit: 10,
        isActive: true,
        hasLoggedIn: false,
      });

      expect(mockUserRepo.findPage).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true, hasLoggedIn: false }),
      );
    });

    it('passes the status filter to the repository', async () => {
      mockUserRepo.findPage!.mockResolvedValue([[], 0]);

      await service.listUsers({
        page: 1,
        limit: 100,
        role: Role.LECTURER,
        status: 'WORKING',
      });

      expect(mockUserRepo.findPage).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.LECTURER, status: 'WORKING' }),
      );
    });

    it('passes the requested sort order to the repository', async () => {
      mockUserRepo.findPage!.mockResolvedValue([[], 0]);

      await service.listUsers({ page: 1, limit: 100, sort: 'fullName' });

      expect(mockUserRepo.findPage).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'fullName' }),
      );
    });

    it('treats an empty search as no search', async () => {
      mockUserRepo.findPage!.mockResolvedValue([[], 0]);

      const result = await service.listUsers({
        page: 1,
        limit: 20,
        search: '',
      });

      expect(mockUserRepo.findPage).toHaveBeenCalledWith(
        expect.objectContaining({ search: undefined }),
      );
      expect(result.items).toEqual([]);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getManagedUser', () => {
    it('returns the admin view of one user', async () => {
      mockUserRepo.findById!.mockResolvedValue(sampleUser);

      const view = await service.getManagedUser('user-uuid-1');

      expect(view).toMatchObject({ id: 'user-uuid-1', hasLoggedIn: true });
    });
  });

  describe('updateUser', () => {
    it('does not modify admin accounts', async () => {
      mockUserRepo.findById!.mockResolvedValue({
        ...sampleUser,
        role: Role.ADMIN,
      });

      await expect(
        service.updateUser('user-uuid-1', { fullName: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('does not change the email of an account linked to Google', async () => {
      mockUserRepo.findById!.mockResolvedValue(sampleUser);

      await expect(
        service.updateUser('user-uuid-1', { email: 'other@school.edu.vn' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an email used by another user', async () => {
      mockUserRepo.findById!.mockResolvedValue(provisionedLecturer);
      mockUserRepo.findByEmail!.mockResolvedValue(sampleUser);

      await expect(
        service.updateUser('user-uuid-2', { email: 'user@school.edu.vn' }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows fixing the email of a pre-provisioned account', async () => {
      mockUserRepo.findById!.mockResolvedValue(provisionedLecturer);
      mockUserRepo.findByEmail!.mockResolvedValue(null);
      mockUserRepo.updateUserAndProfile!.mockResolvedValue(provisionedLecturer);

      await service.updateUser('user-uuid-2', { email: 'fixed@school.edu.vn' });

      expect(mockUserRepo.updateUserAndProfile).toHaveBeenCalledWith(
        provisionedLecturer,
        expect.objectContaining({ email: 'fixed@school.edu.vn' }),
      );
    });

    it('rejects a status that does not belong to the role', async () => {
      mockUserRepo.findById!.mockResolvedValue(provisionedLecturer);

      await expect(
        service.updateUser('user-uuid-2', { status: 'STUDYING' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('maps the status to the lecturer profile', async () => {
      mockUserRepo.findById!.mockResolvedValue(provisionedLecturer);
      mockUserRepo.updateUserAndProfile!.mockResolvedValue(provisionedLecturer);

      await service.updateUser('user-uuid-2', {
        status: 'ON_LEAVE',
      });

      expect(mockUserRepo.updateUserAndProfile).toHaveBeenCalledWith(
        provisionedLecturer,
        expect.objectContaining({ lecturerStatus: 'ON_LEAVE' }),
      );
    });

    it('maps the status to the student profile', async () => {
      mockUserRepo.findById!.mockResolvedValue(sampleUser);
      mockUserRepo.updateUserAndProfile!.mockResolvedValue(sampleUser);

      await service.updateUser('user-uuid-1', { status: 'GRADUATED' });

      expect(mockUserRepo.updateUserAndProfile).toHaveBeenCalledWith(
        sampleUser,
        expect.objectContaining({ studentStatus: 'GRADUATED' }),
      );
    });

    it('turns a duplicate email into a conflict', async () => {
      mockUserRepo.findById!.mockResolvedValue(provisionedLecturer);
      mockUserRepo.updateUserAndProfile!.mockRejectedValue(uniqueViolation());

      await expect(
        service.updateUser('user-uuid-2', { email: 'dup@school.edu.vn' }),
      ).rejects.toThrow(ConflictException);
    });

    it('moves the placeholder name along when the email of a pre-provisioned account is fixed', async () => {
      mockUserRepo.findById!.mockResolvedValue(provisionedLecturer); // name "lecturer" = placeholder of its email
      mockUserRepo.findByEmail!.mockResolvedValue(null);
      mockUserRepo.updateUserAndProfile!.mockResolvedValue(provisionedLecturer);

      await service.updateUser('user-uuid-2', { email: 'fixed@school.edu.vn' });

      expect(mockUserRepo.updateUserAndProfile).toHaveBeenCalledWith(
        provisionedLecturer,
        expect.objectContaining({
          email: 'fixed@school.edu.vn',
          fullName: 'fixed',
        }),
      );
    });

    it('keeps a name the admin typed when the email is fixed', async () => {
      const named = { ...provisionedLecturer, fullName: 'Tran Thi B' };
      mockUserRepo.findById!.mockResolvedValue(named);
      mockUserRepo.findByEmail!.mockResolvedValue(null);
      mockUserRepo.updateUserAndProfile!.mockResolvedValue(named);

      await service.updateUser('user-uuid-2', { email: 'fixed@school.edu.vn' });

      expect(mockUserRepo.updateUserAndProfile).toHaveBeenCalledWith(
        named,
        expect.objectContaining({ fullName: undefined }),
      );
    });

  });

  describe('deactivateUser', () => {
    it('sets isActive to false instead of deleting the user', async () => {
      mockUserRepo.findById!.mockResolvedValue(sampleUser);
      mockUserRepo.setActive!.mockResolvedValue({
        ...sampleUser,
        isActive: false,
      });

      const view = await service.deactivateUser('user-uuid-1');

      expect(mockUserRepo.setActive).toHaveBeenCalledWith('user-uuid-1', false);
      expect(view.isActive).toBe(false);
    });

    it('rejects a user that is already deactivated', async () => {
      mockUserRepo.findById!.mockResolvedValue({
        ...sampleUser,
        isActive: false,
      });

      await expect(service.deactivateUser('user-uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('does not deactivate admin accounts', async () => {
      mockUserRepo.findById!.mockResolvedValue({
        ...sampleUser,
        role: Role.ADMIN,
      });

      await expect(service.deactivateUser('user-uuid-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('activateUser', () => {
    it('restores a deactivated user', async () => {
      mockUserRepo.findById!.mockResolvedValue({
        ...sampleUser,
        isActive: false,
      });
      mockUserRepo.setActive!.mockResolvedValue(sampleUser);

      const view = await service.activateUser('user-uuid-1');

      expect(mockUserRepo.setActive).toHaveBeenCalledWith('user-uuid-1', true);
      expect(view.isActive).toBe(true);
    });

    it('rejects a user that is already active', async () => {
      mockUserRepo.findById!.mockResolvedValue(sampleUser);

      await expect(service.activateUser('user-uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
