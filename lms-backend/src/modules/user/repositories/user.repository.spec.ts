import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Repository, EntityManager } from 'typeorm';
import { UserRepository } from './user.repository.js';
import { User } from '../entities/user.entity.js';
import { Student } from '../entities/student.entity.js';
import { Lecturer } from '../entities/lecturer.entity.js';
import { Admin } from '../entities/admin.entity.js';
import { Role } from '../../../common/enums/role.enum.js';
import { StudentStatus } from '../enums/student-status.enum.js';
import { LecturerStatus } from '../enums/lecturer-status.enum.js';

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockUserRepo: Partial<Record<keyof Repository<User>, ReturnType<typeof vi.fn>>>;
  let mockStudentRepo: Partial<Record<keyof Repository<Student>, ReturnType<typeof vi.fn>>>;
  let mockLecturerRepo: Partial<Record<keyof Repository<Lecturer>, ReturnType<typeof vi.fn>>>;
  let mockManager: Partial<Record<keyof EntityManager, ReturnType<typeof vi.fn>>>;

  const sampleUser: User = {
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
    mockManager = {
      create: vi.fn((entityClass: any, data: any) => ({ ...data })),
      save: vi.fn(async (entity: any) => ({ id: 'usr-1', ...entity })),
    };

    mockUserRepo = {
      findOne: vi.fn(),
      findOneOrFail: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
      manager: {
        transaction: vi.fn(async (cb: (m: EntityManager) => Promise<any>) =>
          cb(mockManager as unknown as EntityManager),
        ),
      } as any,
    };

    mockStudentRepo = {
      findOneBy: vi.fn(),
    };

    mockLecturerRepo = {
      findOneBy: vi.fn(),
    };

    repository = new UserRepository(
      mockUserRepo as unknown as Repository<User>,
      mockStudentRepo as unknown as Repository<Student>,
      mockLecturerRepo as unknown as Repository<Lecturer>,
    );
  });

  describe('createUserWithProfile', () => {
    it('creates a user and student profile when role is STUDENT', async () => {
      const dto = {
        email: 'student@school.edu.vn',
        fullName: 'Student User',
        ssoId: 'sso-stu',
        ssoProvider: 'GOOGLE',
        role: Role.STUDENT,
      };

      const result = await repository.createUserWithProfile(dto);

      expect(mockManager.create).toHaveBeenCalledWith(
        User,
        expect.objectContaining({ email: dto.email, role: Role.STUDENT }),
      );
      expect(mockManager.create).toHaveBeenCalledWith(
        Student,
        expect.objectContaining({
          userId: 'usr-1',
          status: StudentStatus.STUDYING,
          studentCode: expect.stringMatching(/^SV/),
        }),
      );
      expect(result.id).toBe('usr-1');
    });

    it('creates a user and lecturer profile when role is LECTURER', async () => {
      const dto = {
        email: 'lecturer@school.edu.vn',
        fullName: 'Lecturer User',
        ssoId: 'sso-lec',
        ssoProvider: 'GOOGLE',
        role: Role.LECTURER,
      };

      const result = await repository.createUserWithProfile(dto);

      expect(mockManager.create).toHaveBeenCalledWith(
        Lecturer,
        expect.objectContaining({
          userId: 'usr-1',
          status: LecturerStatus.WORKING,
          lecturerCode: expect.stringMatching(/^GV/),
        }),
      );
      expect(result.id).toBe('usr-1');
    });

    it('creates a user and admin profile when role is ADMIN', async () => {
      const dto = {
        email: 'admin@school.edu.vn',
        fullName: 'Admin User',
        ssoId: 'sso-adm',
        ssoProvider: 'GOOGLE',
        role: Role.ADMIN,
      };

      const result = await repository.createUserWithProfile(dto);

      expect(mockManager.create).toHaveBeenCalledWith(Admin, {
        userId: 'usr-1',
      });
      expect(result.id).toBe('usr-1');
    });
  });

  describe('findProfileCode', () => {
    it('returns student code if user is a student', async () => {
      mockStudentRepo.findOneBy!.mockResolvedValue({
        userId: 'usr-1',
        studentCode: 'SV2005001',
      } as any);

      const code = await repository.findProfileCode('usr-1');

      expect(code).toBe('SV2005001');
    });

    it('returns lecturer code if user is a lecturer and not a student', async () => {
      mockStudentRepo.findOneBy!.mockResolvedValue(null);
      mockLecturerRepo.findOneBy!.mockResolvedValue({
        userId: 'usr-2',
        lecturerCode: 'GV001',
      } as any);

      const code = await repository.findProfileCode('usr-2');

      expect(code).toBe('GV001');
    });

    it('returns null if user has no student or lecturer profile', async () => {
      mockStudentRepo.findOneBy!.mockResolvedValue(null);
      mockLecturerRepo.findOneBy!.mockResolvedValue(null);

      const code = await repository.findProfileCode('usr-3');

      expect(code).toBeNull();
    });
  });

  describe('queries: findByEmail, findBySsoId, findById, findByRole', () => {
    it('finds by email', async () => {
      mockUserRepo.findOne!.mockResolvedValue(sampleUser);
      const res = await repository.findByEmail('user@school.edu.vn');
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'user@school.edu.vn' },
      });
      expect(res).toEqual(sampleUser);
    });

    it('finds by ssoId', async () => {
      mockUserRepo.findOne!.mockResolvedValue(sampleUser);
      const res = await repository.findBySsoId('sso-1');
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { ssoId: 'sso-1' },
      });
      expect(res).toEqual(sampleUser);
    });

    it('finds by id', async () => {
      mockUserRepo.findOne!.mockResolvedValue(sampleUser);
      const res = await repository.findById('usr-1');
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'usr-1' },
      });
      expect(res).toEqual(sampleUser);
    });

    it('finds by role when specified', async () => {
      mockUserRepo.find!.mockResolvedValue([sampleUser]);
      const res = await repository.findByRole(Role.LECTURER);
      expect(mockUserRepo.find).toHaveBeenCalledWith({
        where: { role: Role.LECTURER, isActive: true },
        order: { fullName: 'ASC' },
      });
      expect(res).toEqual([sampleUser]);
    });

    it('finds all active users when role is not specified', async () => {
      mockUserRepo.find!.mockResolvedValue([sampleUser]);
      const res = await repository.findByRole(undefined);
      expect(mockUserRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { fullName: 'ASC' },
      });
      expect(res).toEqual([sampleUser]);
    });
  });

  describe('updateSsoLink', () => {
    it('updates sso credentials and returns reloaded user', async () => {
      mockUserRepo.update!.mockResolvedValue(undefined);
      mockUserRepo.findOneOrFail!.mockResolvedValue({
        ...sampleUser,
        ssoId: 'updated-sso',
      });

      const res = await repository.updateSsoLink('usr-1', {
        ssoId: 'updated-sso',
        ssoProvider: 'GOOGLE',
        avatarUrl: 'https://avatar.com',
      });

      expect(mockUserRepo.update).toHaveBeenCalledWith('usr-1', {
        ssoId: 'updated-sso',
        ssoProvider: 'GOOGLE',
        avatarUrl: 'https://avatar.com',
      });
      expect(res.ssoId).toBe('updated-sso');
    });
  });
});
