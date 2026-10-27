import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Repository, EntityManager, QueryFailedError } from 'typeorm';
import {
  UserRepository,
  isForeignKeyViolation,
  isUniqueViolation,
  uniqueViolationField,
} from './user.repository.js';
import { User } from '../entities/user.entity.js';
import { Student } from '../entities/student.entity.js';
import { Lecturer } from '../entities/lecturer.entity.js';
import { Admin } from '../entities/admin.entity.js';
import { Role } from '../../../common/enums/role.enum.js';
import { StudentStatus } from '../enums/student-status.enum.js';
import { LecturerStatus } from '../enums/lecturer-status.enum.js';

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockUserRepo: Partial<
    Record<keyof Repository<User>, ReturnType<typeof vi.fn>>
  >;
  let mockStudentRepo: Partial<
    Record<keyof Repository<Student>, ReturnType<typeof vi.fn>>
  >;
  let mockLecturerRepo: Partial<
    Record<keyof Repository<Lecturer>, ReturnType<typeof vi.fn>>
  >;
  let mockManager: Partial<
    Record<keyof EntityManager, ReturnType<typeof vi.fn>>
  >;

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
      update: vi.fn(),
      delete: vi.fn(),
      findOneOrFail: vi.fn(),
      query: vi.fn(async (sql: string) => {
        if (sql.includes('nextval')) return [{ nextval: '1' }];
        if (sql.includes('COUNT')) return [{ count: '0' }];
        return [];
      }),
    };

    mockUserRepo = {
      findOne: vi.fn(),
      findOneOrFail: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
      createQueryBuilder: vi.fn(),
      manager: {
        transaction: vi.fn(async (cb: (m: EntityManager) => Promise<any>) =>
          cb(mockManager as unknown as EntityManager),
        ),
      } as any,
    };

    mockStudentRepo = {
      findOneBy: vi.fn(),
      findBy: vi.fn(),
    };

    mockLecturerRepo = {
      findOneBy: vi.fn(),
      findBy: vi.fn(),
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

  describe('createProvisionedUser', () => {
    it('creates a user without SSO identity and a lecturer profile with a generated code', async () => {
      const result = await repository.createProvisionedUser({
        email: 'gv@school.edu.vn',
        fullName: 'gv',
        role: Role.LECTURER,
      });

      expect(mockManager.create).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          email: 'gv@school.edu.vn',
          ssoId: null,
          ssoProvider: null,
          role: Role.LECTURER,
        }),
      );
      expect(mockManager.create).toHaveBeenCalledWith(
        Lecturer,
        expect.objectContaining({
          userId: 'usr-1',
          status: LecturerStatus.WORKING,
          lecturerCode: expect.stringMatching(/^GV\d{8}$/),
        }),
      );
      expect(result.id).toBe('usr-1');
    });

    it('uses the code the admin typed instead of generating one', async () => {
      await repository.createProvisionedUser({
        email: 'sv@school.edu.vn',
        fullName: 'sv',
        role: Role.STUDENT,
        code: 'SV-CUSTOM',
      });

      expect(mockManager.create).toHaveBeenCalledWith(
        Student,
        expect.objectContaining({ userId: 'usr-1', studentCode: 'SV-CUSTOM' }),
      );
    });
  });

  describe('claimSso', () => {
    it('binds the Google identity only to an account without one and returns the reloaded user', async () => {
      mockUserRepo.update!.mockResolvedValue({ affected: 1 });
      mockUserRepo.findOneOrFail!.mockResolvedValue({
        ...sampleUser,
        ssoId: 'updated-sso',
      });

      const res = await repository.claimSso('usr-1', {
        ssoId: 'updated-sso',
        ssoProvider: 'GOOGLE',
        avatarUrl: 'https://avatar.com',
        fullName: 'Nguyen Van A',
      });

      const [criteria, values] = mockUserRepo.update!.mock.calls[0];
      expect(criteria).toMatchObject({ id: 'usr-1' });
      expect(criteria.ssoId).toBeDefined(); // IsNull() operator
      expect(values).toEqual({
        ssoId: 'updated-sso',
        ssoProvider: 'GOOGLE',
        avatarUrl: 'https://avatar.com',
        fullName: 'Nguyen Van A',
      });
      expect(res?.ssoId).toBe('updated-sso');
    });

    it('returns null when the account was already claimed', async () => {
      mockUserRepo.update!.mockResolvedValue({ affected: 0 });

      const res = await repository.claimSso('usr-1', {
        ssoId: 'x',
        ssoProvider: 'GOOGLE',
        avatarUrl: null,
      });

      expect(res).toBeNull();
      expect(mockUserRepo.findOneOrFail).not.toHaveBeenCalled();
    });
  });

  describe('findPage', () => {
    const createQueryBuilderMock = () => {
      const qb = {
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[sampleUser], 41]),
      };
      mockUserRepo.createQueryBuilder!.mockReturnValue(qb);
      return qb;
    };

    it('applies every filter and the page window', async () => {
      const qb = createQueryBuilderMock();

      const [users, total] = await repository.findPage({
        role: Role.LECTURER,
        isActive: false,
        search: '50%_off',
        page: 3,
        limit: 20,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('u.role = :role', {
        role: Role.LECTURER,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('u.isActive = :isActive', {
        isActive: false,
      });
      // % and _ typed by the admin are escaped, so they are matched literally
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(u.fullName ILIKE :search OR u.email ILIKE :search)',
        { search: '%50\\%\\_off%' },
      );
      expect(qb.skip).toHaveBeenCalledWith(40);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(users).toEqual([sampleUser]);
      expect(total).toBe(41);
    });

    it('filters accounts that have not signed in yet (pending)', async () => {
      const qb = createQueryBuilderMock();

      await repository.findPage({ hasLoggedIn: false, page: 1, limit: 10 });

      expect(qb.andWhere).toHaveBeenCalledWith('u.ssoId IS NULL');
    });

    it('filters accounts that are linked to a Google login', async () => {
      const qb = createQueryBuilderMock();

      await repository.findPage({ hasLoggedIn: true, page: 1, limit: 10 });

      expect(qb.andWhere).toHaveBeenCalledWith('u.ssoId IS NOT NULL');
    });

    it('filters by the status of the student / lecturer profile', async () => {
      const qb = createQueryBuilderMock();

      await repository.findPage({
        role: Role.LECTURER,
        status: 'WORKING',
        page: 1,
        limit: 100,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('lecturers l WHERE l.user_id = u.id'),
        { status: 'WORKING' },
      );
    });

    it('adds no filter when none is given and lists the newest accounts first', async () => {
      const qb = createQueryBuilderMock();

      await repository.findPage({ page: 1, limit: 20 });

      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('u.createdAt', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(0);
    });

    it('sorts by name A-Z when asked', async () => {
      const qb = createQueryBuilderMock();

      await repository.findPage({ page: 1, limit: 100, sort: 'fullName' });

      expect(qb.orderBy).toHaveBeenCalledWith('u.fullName', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('u.id', 'ASC');
    });
  });

  describe('findProfiles', () => {
    it('returns code and status of students and lecturers keyed by user id', async () => {
      mockStudentRepo.findBy!.mockResolvedValue([
        { userId: 'u1', studentCode: 'SV1', status: StudentStatus.STUDYING },
      ]);
      mockLecturerRepo.findBy!.mockResolvedValue([
        { userId: 'u2', lecturerCode: 'GV1', status: LecturerStatus.ON_LEAVE },
      ]);

      const profiles = await repository.findProfiles(['u1', 'u2', 'u3']);

      expect(profiles.get('u1')).toEqual({ code: 'SV1', status: 'STUDYING' });
      expect(profiles.get('u2')).toEqual({ code: 'GV1', status: 'ON_LEAVE' });
      expect(profiles.has('u3')).toBe(false);
    });

    it('does not query when there are no ids', async () => {
      const profiles = await repository.findProfiles([]);

      expect(profiles.size).toBe(0);
      expect(mockStudentRepo.findBy).not.toHaveBeenCalled();
    });

    it('findProfile returns null for a user without a profile', async () => {
      mockStudentRepo.findBy!.mockResolvedValue([]);
      mockLecturerRepo.findBy!.mockResolvedValue([]);

      expect(await repository.findProfile('admin-1')).toBeNull();
    });
  });

  describe('updateUserAndProfile', () => {
    it('updates the user row and the lecturer profile in one transaction', async () => {
      mockManager.findOneOrFail!.mockResolvedValue(sampleUser);
      const lecturerUser: User = { ...sampleUser, role: Role.LECTURER };

      const res = await repository.updateUserAndProfile(lecturerUser, {
        fullName: 'New Name',
        lecturerStatus: LecturerStatus.ON_LEAVE,
      });

      expect(mockManager.update).toHaveBeenCalledWith(User, 'usr-1', {
        fullName: 'New Name',
        email: undefined,
      });
      expect(mockManager.update).toHaveBeenCalledWith(Lecturer, 'usr-1', {
        status: LecturerStatus.ON_LEAVE,
      });
      expect(res).toEqual(sampleUser);
    });

    it('does not touch the profile when only the name changes', async () => {
      mockManager.findOneOrFail!.mockResolvedValue(sampleUser);

      await repository.updateUserAndProfile(sampleUser, {
        fullName: 'Only Name',
      });

      expect(mockManager.update).toHaveBeenCalledTimes(1);
      expect(mockManager.update).toHaveBeenCalledWith(User, 'usr-1', {
        fullName: 'Only Name',
        email: undefined,
      });
    });

    it('updates the student profile of a student', async () => {
      mockManager.findOneOrFail!.mockResolvedValue(sampleUser);

      await repository.updateUserAndProfile(sampleUser, {
        studentStatus: StudentStatus.GRADUATED,
      });

      expect(mockManager.update).toHaveBeenCalledWith(Student, 'usr-1', {
        status: StudentStatus.GRADUATED,
      });
    });
  });

  describe('updateUserAndProfile: role change', () => {
    it('swaps a student profile for a lecturer profile with a generated code', async () => {
      mockManager.findOneOrFail!.mockResolvedValue({
        ...sampleUser,
        role: Role.LECTURER,
      });

      await repository.updateUserAndProfile(sampleUser, {
        role: Role.LECTURER,
        lecturerStatus: LecturerStatus.ON_LEAVE,
      });

      expect(mockManager.delete).toHaveBeenCalledWith(Student, {
        userId: 'usr-1',
      });
      expect(mockManager.update).toHaveBeenCalledWith(User, 'usr-1', {
        role: Role.LECTURER,
      });
      expect(mockManager.create).toHaveBeenCalledWith(
        Lecturer,
        expect.objectContaining({
          userId: 'usr-1',
          lecturerCode: expect.stringMatching(/^GV\d{8}$/),
          status: LecturerStatus.WORKING,
        }),
      );
      // the requested status is applied to the NEW profile
      expect(mockManager.update).toHaveBeenCalledWith(Lecturer, 'usr-1', {
        status: LecturerStatus.ON_LEAVE,
      });
    });

    it('swaps a lecturer profile for a student profile', async () => {
      mockManager.findOneOrFail!.mockResolvedValue(sampleUser);
      const lecturerUser: User = { ...sampleUser, role: Role.LECTURER };

      await repository.updateUserAndProfile(lecturerUser, {
        role: Role.STUDENT,
      });

      expect(mockManager.delete).toHaveBeenCalledWith(Lecturer, {
        userId: 'usr-1',
      });
      expect(mockManager.create).toHaveBeenCalledWith(
        Student,
        expect.objectContaining({
          userId: 'usr-1',
          studentCode: expect.stringMatching(/^SV\d{8}$/),
          status: StudentStatus.STUDYING,
        }),
      );
    });

    it('leaves the profile alone when the role is the same', async () => {
      mockManager.findOneOrFail!.mockResolvedValue(sampleUser);

      await repository.updateUserAndProfile(sampleUser, {
        role: Role.STUDENT,
      });

      expect(mockManager.delete).not.toHaveBeenCalled();
    });
  });

  describe('database error helpers', () => {
    const queryError = (driverError: object) =>
      new QueryFailedError('SQL', [], Object.assign(new Error('x'), driverError));

    it('reads the offending column of a unique violation', () => {
      expect(
        uniqueViolationField(
          queryError({ code: '23505', detail: 'Key (email)=(a@b.c) already exists.' }),
        ),
      ).toBe('email');
      expect(
        uniqueViolationField(
          queryError({
            code: '23505',
            detail: 'Key (student_code)=(SV26000001) already exists.',
          }),
        ),
      ).toBe('code');
      expect(
        uniqueViolationField(
          queryError({
            code: '23505',
            detail: 'Key (lecturer_code)=(GV26000001) already exists.',
          }),
        ),
      ).toBe('code');
    });

    it('returns null when the column is unknown or the error is not a unique violation', () => {
      expect(uniqueViolationField(queryError({ code: '23505' }))).toBeNull();
      expect(
        uniqueViolationField(queryError({ code: '23503', detail: 'Key (email)=(x)' })),
      ).toBeNull();
      expect(uniqueViolationField(new Error('boom'))).toBeNull();
    });

    it('recognises a foreign-key violation', () => {
      expect(isForeignKeyViolation(queryError({ code: '23503' }))).toBe(true);
      expect(isForeignKeyViolation(queryError({ code: '23505' }))).toBe(false);
      expect(isForeignKeyViolation(new Error('boom'))).toBe(false);
    });
  });

  describe('setActive', () => {
    it('flips isActive without deleting the row', async () => {
      mockUserRepo.update!.mockResolvedValue({ affected: 1 });
      mockUserRepo.findOneOrFail!.mockResolvedValue({
        ...sampleUser,
        isActive: false,
      });

      const res = await repository.setActive('usr-1', false);

      expect(mockUserRepo.update).toHaveBeenCalledWith('usr-1', {
        isActive: false,
      });
      expect(res.isActive).toBe(false);
    });
  });

  describe('isUniqueViolation', () => {
    it('recognises a PostgreSQL unique violation', () => {
      const error = new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      );
      expect(isUniqueViolation(error)).toBe(true);
    });

    it('ignores other database errors and non-database errors', () => {
      const other = new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('null value'), { code: '23502' }),
      );
      expect(isUniqueViolation(other)).toBe(false);
      expect(isUniqueViolation(new Error('boom'))).toBe(false);
    });
  });
});
