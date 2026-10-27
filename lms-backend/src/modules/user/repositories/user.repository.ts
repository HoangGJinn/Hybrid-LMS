import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  In,
  IsNull,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { User } from '../entities/user.entity.js';
import { Student } from '../entities/student.entity.js';
import { Lecturer } from '../entities/lecturer.entity.js';
import { Admin } from '../entities/admin.entity.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { UserSortField } from '../dto/list-users-query.dto.js';
import { Role } from '../../../common/enums/role.enum.js';
import { StudentStatus } from '../enums/student-status.enum.js';
import { LecturerStatus } from '../enums/lecturer-status.enum.js';
import { UserProfileInfo } from '../types/managed-user-view.type.js';
import { generateProfileCode } from '../utils/profile-code.util.js';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

/** Filters of the admin user list. */
export interface UserListFilters {
  readonly role?: Role;
  readonly isActive?: boolean;
  /** false = pre-provisioned account nobody has signed in to yet; true = linked to a Google account. */
  readonly hasLoggedIn?: boolean;
  /** Student or lecturer profile status, e.g. WORKING. */
  readonly status?: string;
  readonly search?: string;
  /** Defaults to newest first. */
  readonly sort?: UserSortField;
  readonly page: number;
  readonly limit: number;
}

/** Data an admin can set when pre-provisioning an account. */
export interface ProvisionedUserData {
  readonly email: string;
  readonly fullName: string;
  readonly role: Role.LECTURER | Role.STUDENT;
  /** Student / lecturer code. Generated when omitted. */
  readonly code?: string;
}

/** Fields of a user (and of its student / lecturer profile) an admin may change. */
export interface UserUpdateData {
  readonly fullName?: string;
  readonly email?: string;
  /** Moves the account to the other profile type; the old profile row is deleted, a new one is created. */
  readonly role?: Role.LECTURER | Role.STUDENT;
  /** Only meaningful for a student (after any role change); the service rejects it for other roles. */
  readonly studentStatus?: StudentStatus;
  /** Only meaningful for a lecturer (after any role change); the service rejects it for other roles. */
  readonly lecturerStatus?: LecturerStatus;
}

/** Data copied from the Google profile when a pre-provisioned account is claimed. */
export interface SsoClaimData {
  readonly ssoId: string;
  readonly ssoProvider: string;
  readonly avatarUrl: string | null;
  /** Set only when the admin did not provide a real name. */
  readonly fullName?: string;
}

const driverErrorOf = (error: unknown): object | null => {
  if (!(error instanceof QueryFailedError)) return null;
  const driverError: unknown = error.driverError;
  return typeof driverError === 'object' ? driverError : null;
};

const hasDriverCode = (error: unknown, code: string): boolean => {
  const driverError = driverErrorOf(error);
  return (
    driverError !== null && 'code' in driverError && driverError.code === code
  );
};

/** True when a database error is a unique-constraint violation (duplicate email, code or ssoId). */
export const isUniqueViolation = (error: unknown): boolean =>
  hasDriverCode(error, PG_UNIQUE_VIOLATION);

/** True when a database error is a foreign-key violation (a row is still referenced by another table). */
export const isForeignKeyViolation = (error: unknown): boolean =>
  hasDriverCode(error, PG_FOREIGN_KEY_VIOLATION);

/** Which form field a unique violation is about; null when the driver does not say. */
export const uniqueViolationField = (error: unknown): 'email' | 'code' | null => {
  if (!isUniqueViolation(error)) return null;
  const driverError = driverErrorOf(error);
  // Postgres: `Key (email)=(a@b.c) already exists.`
  const detail =
    driverError !== null &&
    'detail' in driverError &&
    typeof driverError.detail === 'string'
      ? driverError.detail
      : '';
  if (detail.includes('(email)')) return 'email';
  if (detail.includes('(student_code)') || detail.includes('(lecturer_code)'))
    return 'code';
  return null;
};

/** Escapes `%`, `_` and `\` so user input is matched literally inside ILIKE. */
const escapeLike = (value: string): string =>
  value.replace(/[\\%_]/g, (character) => `\\${character}`);

/** Encapsulates database operations for the User aggregate (User + Student/Lecturer/Admin profiles). */
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Lecturer)
    private readonly lecturerRepo: Repository<Lecturer>,
  ) {}

  async createUserWithProfile(dto: CreateUserDto): Promise<User> {
    const role = dto.role ?? Role.STUDENT;

    return this.userRepo.manager.transaction(async (manager) => {
      // 1. Create User record
      const user = manager.create(User, {
        email: dto.email,
        fullName: dto.fullName,
        ssoId: dto.ssoId,
        ssoProvider: dto.ssoProvider,
        avatarUrl: dto.avatarUrl ?? null,
        role,
      });
      const savedUser = await manager.save(user);

      // 2. Auto-create corresponding role profile
      await this.createProfile(manager, savedUser.id, role);

      return savedUser;
    });
  }

  /**
   * Creates an account for someone who has not logged in yet: no SSO identity, plus the profile row
   * that matches the role. The first Google login with this email claims it (see `claimSso`).
   */
  async createProvisionedUser(data: ProvisionedUserData): Promise<User> {
    return this.userRepo.manager.transaction(async (manager) => {
      const user = manager.create(User, {
        email: data.email,
        fullName: data.fullName,
        ssoId: null,
        ssoProvider: null,
        avatarUrl: null,
        role: data.role,
      });
      const savedUser = await manager.save(user);
      await this.createProfile(manager, savedUser.id, data.role, data.code);
      return savedUser;
    });
  }

  /** Profile row of a new user: admin, lecturer or student. A missing `code` is generated. */
  private async createProfile(
    manager: EntityManager,
    userId: string,
    role: Role,
    code?: string,
  ): Promise<void> {
    if (role === Role.ADMIN) {
      const admin = manager.create(Admin, { userId });
      await manager.save(admin);
    } else if (role === Role.LECTURER) {
      const lecturer = manager.create(Lecturer, {
        userId,
        lecturerCode: code ?? await generateProfileCode('GV', manager),
        status: LecturerStatus.WORKING,
      });
      await manager.save(lecturer);
    } else {
      const student = manager.create(Student, {
        userId,
        studentCode: code ?? await generateProfileCode('SV', manager),
        status: StudentStatus.STUDYING,
      });
      await manager.save(student);
    }
  }

  /** Backwards compatibility alias */
  async createUserWithStudentProfile(dto: CreateUserDto): Promise<User> {
    return this.createUserWithProfile(dto);
  }

  /** Student code or lecturer code of the user; null for users without such a profile (e.g. admins). */
  async findProfileCode(userId: string): Promise<string | null> {
    const student = await this.studentRepo.findOneBy({ userId });
    if (student) return student.studentCode;
    const lecturer = await this.lecturerRepo.findOneBy({ userId });
    return lecturer?.lecturerCode ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findBySsoId(ssoId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { ssoId } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  /**
   * Attaches a Google account to a user that has none yet. The `sso_id IS NULL` condition makes it
   * atomic: of two simultaneous first logins only one wins. Returns null when the account was
   * already claimed.
   */
  async claimSso(id: string, data: SsoClaimData): Promise<User | null> {
    const result = await this.userRepo.update(
      { id, ssoId: IsNull() },
      {
        ssoId: data.ssoId,
        ssoProvider: data.ssoProvider,
        avatarUrl: data.avatarUrl ?? undefined,
        fullName: data.fullName,
      },
    );
    if (!result.affected) return null;
    return this.userRepo.findOneOrFail({ where: { id } });
  }

  /** One page of users matching the filters, newest first, plus the total number of matches. */
  async findPage(filters: UserListFilters): Promise<[User[], number]> {
    const query = this.userRepo.createQueryBuilder('u');
    if (filters.role) query.andWhere('u.role = :role', { role: filters.role });
    if (filters.isActive !== undefined) {
      query.andWhere('u.isActive = :isActive', { isActive: filters.isActive });
    }
    if (filters.hasLoggedIn !== undefined) {
      query.andWhere(
        filters.hasLoggedIn ? 'u.ssoId IS NOT NULL' : 'u.ssoId IS NULL',
      );
    }
    if (filters.status) {
      // The status lives on the student / lecturer profile row; compare as text because the two enums differ.
      query.andWhere(
        '(EXISTS (SELECT 1 FROM students s WHERE s.user_id = u.id AND s.status::text = :status)' +
          ' OR EXISTS (SELECT 1 FROM lecturers l WHERE l.user_id = u.id AND l.status::text = :status))',
        { status: filters.status },
      );
    }
    if (filters.search) {
      query.andWhere('(u.fullName ILIKE :search OR u.email ILIKE :search)', {
        search: `%${escapeLike(filters.search)}%`,
      });
    }
    if (filters.sort === 'fullName') query.orderBy('u.fullName', 'ASC');
    else query.orderBy('u.createdAt', 'DESC');
    return query
      .addOrderBy('u.id', 'ASC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();
  }

  /** Code and status of the student / lecturer profile of each given user, keyed by user id. */
  async findProfiles(userIds: string[]): Promise<Map<string, UserProfileInfo>> {
    const profiles = new Map<string, UserProfileInfo>();
    if (userIds.length === 0) return profiles;
    const [students, lecturers] = await Promise.all([
      this.studentRepo.findBy({ userId: In(userIds) }),
      this.lecturerRepo.findBy({ userId: In(userIds) }),
    ]);
    for (const student of students) {
      profiles.set(student.userId, {
        code: student.studentCode,
        status: student.status,
      });
    }
    for (const lecturer of lecturers) {
      profiles.set(lecturer.userId, {
        code: lecturer.lecturerCode,
        status: lecturer.status,
      });
    }
    return profiles;
  }

  async findProfile(userId: string): Promise<UserProfileInfo | null> {
    return (await this.findProfiles([userId])).get(userId) ?? null;
  }

  /**
   * Applies an admin edit to the user row and to its profile row in one transaction.
   * A role change swaps the profile row first, so the status of `data` is applied to the new profile.
   */
  async updateUserAndProfile(user: User, data: UserUpdateData): Promise<User> {
    return this.userRepo.manager.transaction(async (manager) => {
      if (data.fullName !== undefined || data.email !== undefined) {
        await manager.update(User, user.id, {
          fullName: data.fullName,
          email: data.email,
        });
      }
      const role = data.role ?? user.role;
      if (role !== user.role) {
        await this.switchProfile(manager, user, role);
      }
      if (role === Role.LECTURER) {
        if (data.lecturerStatus !== undefined) {
          await manager.update(Lecturer, user.id, {
            status: data.lecturerStatus,
          });
        }
      } else if (role === Role.STUDENT) {
        if (data.studentStatus !== undefined) {
          await manager.update(Student, user.id, {
            status: data.studentStatus,
          });
        }
      }
      return manager.findOneOrFail(User, { where: { id: user.id } });
    });
  }

  /**
   * Student <-> lecturer: deletes the old profile row, sets the new role and creates the new profile
   * with a generated code. When other tables still reference the old profile (classes, enrolments,
   * exams, ...) the database refuses the delete and the whole transaction is rolled back.
   */
  private async switchProfile(
    manager: EntityManager,
    user: User,
    role: Role,
  ): Promise<void> {
    if (user.role === Role.STUDENT) {
      await manager.delete(Student, { userId: user.id });
    } else if (user.role === Role.LECTURER) {
      await manager.delete(Lecturer, { userId: user.id });
    }
    await manager.update(User, user.id, { role });
    await this.createProfile(manager, user.id, role);
  }

  /** Soft delete / restore: users are never removed from the database. */
  async setActive(id: string, isActive: boolean): Promise<User> {
    await this.userRepo.update(id, { isActive });
    return this.userRepo.findOneOrFail({ where: { id } });
  }

  async findByRole(role?: Role): Promise<User[]> {
    const where = role ? { role, isActive: true } : { isActive: true };
    return this.userRepo.find({ where, order: { fullName: 'ASC' } });
  }
}
