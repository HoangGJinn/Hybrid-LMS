import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../entities/user.entity.js';
import {
  UserRepository,
  UserUpdateData,
} from '../repositories/user.repository.js';
import {
  isUniqueViolation,
  uniqueViolationField,
} from '../../../common/utils/pg-error.util.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import {
  CreateManagedUserDto,
  ProvisionableRole,
} from '../dto/create-managed-user.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { ListUsersQueryDto } from '../dto/list-users-query.dto.js';
import { LecturerStatus } from '../enums/lecturer-status.enum.js';
import { StudentStatus } from '../enums/student-status.enum.js';
import { GoogleAccountData } from '../types/google-account-data.type.js';
import { ManagedUserView } from '../types/managed-user-view.type.js';
import { StudentSummary } from '../types/student-summary.type.js';
import { UserView } from '../types/user-view.type.js';
import { deriveDisplayName } from '../utils/display-name.util.js';
import { profilePrefixFor } from '../utils/profile-code.util.js';
import { PaginatedResult } from '../../../common/types/paginated-result.type.js';
import { Role } from '../../../common/enums/role.enum.js';
import { emptyToUndefined } from '../../../common/utils/string.util.js';

const isStudentStatus = (value: string): value is StudentStatus =>
  Object.values(StudentStatus).some((status) => status === value);

const isLecturerStatus = (value: string): value is LecturerStatus =>
  Object.values(LecturerStatus).some((status) => status === value);

/** Handles business logic for the User module. */
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) { }

  /**
   * Creates the account of someone signing in for the first time. Two parallel first logins of the
   * same Google account race on the unique ssoId / email: the loser gets the account the winner created.
   */
  async createUser(dto: CreateUserDto): Promise<User> {
    try {
      return await this.userRepository.createUserWithProfile(dto);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.userRepository.findBySsoId(dto.ssoId);
      if (existing) return existing;
      // The email belongs to somebody else (e.g. created by an admin a moment ago).
      throw new ConflictException({
        message: 'Email is already in use',
        field: 'email',
      });
    }
  }

  async findUsers(role?: Role): Promise<User[]> {
    return this.userRepository.findByRole(role);
  }

  async getProfileCode(userId: string): Promise<string | null> {
    return this.userRepository.findProfileCode(userId);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findBySsoId(ssoId: string): Promise<User | null> {
    return this.userRepository.findBySsoId(ssoId);
  }

  async findForPasswordAuth(
    identifier: string,
  ): Promise<{ user: UserView; passwordHash: string | null } | null> {
    const user = await this.userRepository.findForPasswordAuth(identifier);
    if (!user) return null;
    return {
      user: UserView.fromEntity(user),
      passwordHash: user.passwordHash,
    };
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  /**
   * Binds a Google account to a pre-provisioned user (one with no SSO identity yet).
   * The role and the profile row stay exactly as the admin set them. The Google name is used only
   * when the admin did not type a real one.
   * Returns null when the user is already linked to a Google account (or someone claimed it first).
   */
  async claimProvisionedAccount(
    id: string,
    account: GoogleAccountData,
  ): Promise<User | null> {
    const user = await this.getUserById(id);
    if (user.ssoId !== null) return null;
    const hasPlaceholderName = user.fullName === deriveDisplayName(user.email);
    const claimed = await this.userRepository.claimSso(id, {
      ssoId: account.ssoId,
      ssoProvider: account.ssoProvider,
      avatarUrl: account.avatarUrl,
      fullName: hasPlaceholderName ? account.fullName : undefined,
    });
    if (claimed) return claimed;
    // Lost the claim: if the winner was a parallel login of this same Google account, it is still a success.
    const current = await this.userRepository.findById(id);
    return current?.ssoId === account.ssoId ? current : null;
  }

  /** Admin: pre-provisions an account by email. It becomes usable at the first Google login with that email. */
  async createManagedUser(dto: CreateManagedUserDto): Promise<ManagedUserView> {
    const email = dto.email.trim().toLowerCase();
    const role = dto.role ?? Role.LECTURER;
    this.assertCodeMatchesRole(role, dto.code);
    if (await this.userRepository.findByEmail(email)) {
      throw new ConflictException({
        message: `Email ${email} already exists`,
        field: 'email',
      });
    }
    try {
      const user = await this.userRepository.createProvisionedUser({
        email,
        fullName: dto.fullName ?? deriveDisplayName(email),
        role,
        code: dto.code,
      });
      return await this.toManagedView(user);
    } catch (error) {
      // Lost a race with another request, or the code is taken.
      if (isUniqueViolation(error)) {
        throw this.conflictFromUniqueViolation(error);
      }
      throw error;
    }
  }

  /** Admin: one page of users, filtered by role / active flag / name-or-email search. */
  async listUsers(
    query: ListUsersQueryDto,
  ): Promise<PaginatedResult<ManagedUserView>> {
    const search = emptyToUndefined(query.search);
    const [users, total] = await this.userRepository.findPage({
      role: query.role,
      isActive: query.isActive,
      hasLoggedIn: query.hasLoggedIn,
      status: query.status,
      search,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    });
    const profiles = await this.userRepository.findProfiles(
      users.map((user) => user.id),
    );
    const items = users.map((user) =>
      ManagedUserView.fromEntity(user, profiles.get(user.id)),
    );
    return PaginatedResult.of(items, total, query.page, query.limit);
  }

  async getManagedUser(id: string): Promise<ManagedUserView> {
    return this.toManagedView(await this.getUserById(id));
  }

  /** Students by user id (unknown ids are simply missing from the result). */
  async findStudentsByIds(ids: string[]): Promise<StudentSummary[]> {
    const students = await this.userRepository.findStudentsByIds(ids);
    return students.map((s) => StudentSummary.fromEntity(s));
  }

  async findStudentsByCodes(codes: string[]): Promise<StudentSummary[]> {
    const students = await this.userRepository.findStudentsByCodes(codes);
    return students.map((s) => StudentSummary.fromEntity(s));
  }

  async findStudentsByEmails(emails: string[]): Promise<StudentSummary[]> {
    const students = await this.userRepository.findStudentsByEmails(emails);
    return students.map((s) => StudentSummary.fromEntity(s));
  }

  /** Students who can still be added to a class (active account, status STUDYING). */
  async searchEnrollableStudents(
    search: string | undefined,
    limit: number,
  ): Promise<StudentSummary[]> {
    const students = await this.userRepository.searchEnrollableStudents(
      search,
      limit,
    );
    return students.map((s) => StudentSummary.fromEntity(s));
  }

  /**
   * Admin: edits name, email (only before the first Google login) and profile status.
   * The role and profile code are permanent.
   */
  async updateUser(id: string, dto: UpdateUserDto): Promise<ManagedUserView> {
    const user = await this.getUserById(id);
    this.assertManageable(user);
    await this.assertEmailChangeAllowed(user, dto.email);

    const data: UserUpdateData = {
      fullName:
        dto.fullName ?? this.placeholderNameAfterEmailChange(user, dto.email),
      email: dto.email,
      ...this.resolveStatus(user.role, dto.status),
    };
    try {
      return await this.toManagedView(
        await this.userRepository.updateUserAndProfile(user, data),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          message: 'Email is already in use',
          field: 'email',
        });
      }
      throw error;
    }
  }

  /** Admin: soft delete. The row, its history and its classes stay; the user just cannot sign in or call the API. */
  async deactivateUser(id: string): Promise<ManagedUserView> {
    const user = await this.getUserById(id);
    this.assertManageable(user);
    if (!user.isActive) throw new ConflictException('User already deactivated');
    return this.toManagedView(await this.userRepository.setActive(id, false));
  }

  /** Admin: undoes a deactivation. */
  async activateUser(id: string): Promise<ManagedUserView> {
    const user = await this.getUserById(id);
    this.assertManageable(user);
    if (user.isActive) throw new ConflictException('User is already active');
    return this.toManagedView(await this.userRepository.setActive(id, true));
  }

  private async toManagedView(user: User): Promise<ManagedUserView> {
    const profile = await this.userRepository.findProfile(user.id);
    return ManagedUserView.fromEntity(user, profile ?? undefined);
  }

  /** Admin accounts are managed through ADMIN_EMAILS / the database, never through this API. */
  private assertManageable(user: User): void {
    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('Admin accounts cannot be modified here');
    }
  }

  private async assertEmailChangeAllowed(
    user: User,
    newEmail: string | undefined,
  ): Promise<void> {
    if (newEmail === undefined || newEmail === user.email) return;
    if (user.ssoId !== null) {
      throw new BadRequestException(
        'Email of an account linked to Google cannot be changed',
      );
    }
    const owner = await this.userRepository.findByEmail(newEmail);
    if (owner && owner.id !== user.id) {
      throw new ConflictException({
        message: `Email ${newEmail} already exists`,
        field: 'email',
      });
    }
  }

  /** A student code starts with SV and a lecturer code with GV (the DTO only checks the overall format). */
  private assertCodeMatchesRole(
    role: ProvisionableRole,
    code: string | undefined,
  ): void {
    if (code === undefined) return;
    const prefix = profilePrefixFor(role);
    if (!code.startsWith(prefix)) {
      throw new BadRequestException(
        `A ${role.toLowerCase()} code must start with ${prefix}`,
      );
    }
  }

  /** Conflict that names the offending field when the database says which one it is. */
  private conflictFromUniqueViolation(error: unknown): ConflictException {
    const field = uniqueViolationField(error);
    if (field === 'email') {
      return new ConflictException({
        message: 'Email is already in use',
        field,
      });
    }
    if (field === 'code') {
      return new ConflictException({
        message: 'Code is already in use',
        field,
      });
    }
    return new ConflictException('Email or code is already in use');
  }

  /**
   * A pre-provisioned account without a typed name shows a placeholder derived from its email.
   * When the email is fixed, the placeholder follows it; otherwise the Google name would never
   * replace it at the first login (see `claimProvisionedAccount`).
   */
  private placeholderNameAfterEmailChange(
    user: User,
    newEmail: string | undefined,
  ): string | undefined {
    if (newEmail === undefined || newEmail === user.email) return undefined;
    return user.fullName === deriveDisplayName(user.email)
      ? deriveDisplayName(newEmail)
      : undefined;
  }

  /** Maps the free-text `status` of the DTO to the enum of the user's own profile type. */
  private resolveStatus(
    role: Role,
    status: string | undefined,
  ): Pick<UserUpdateData, 'studentStatus' | 'lecturerStatus'> {
    if (status === undefined) return {};
    if (role === Role.STUDENT && isStudentStatus(status)) {
      return { studentStatus: status };
    }
    if (role === Role.LECTURER && isLecturerStatus(status)) {
      return { lecturerStatus: status };
    }
    throw new BadRequestException(`Invalid status "${status}" for a ${role}`);
  }
}
