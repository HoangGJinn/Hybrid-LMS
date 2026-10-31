import { Injectable } from '@nestjs/common';
import { UserService } from '../services/user.service.js';
import { UserView } from '../types/user-view.type.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { GoogleAccountData } from '../types/google-account-data.type.js';
import { StudentSummary } from '../types/student-summary.type.js';
import { Role } from '../../../common/enums/role.enum.js';

/**
 * Facade pattern for inter-module communication.
 * Other modules (like AuthModule) MUST interact via UserFacade, NOT UserService directly.
 * Only UserView (read-only projection) is exposed — never raw User entities.
 */
@Injectable()
export class UserFacade {
  constructor(private readonly userService: UserService) {}

  async createUser(dto: CreateUserDto): Promise<UserView> {
    const user = await this.userService.createUser(dto);
    return UserView.fromEntity(user);
  }

  async findUsers(role?: Role): Promise<UserView[]> {
    const users = await this.userService.findUsers(role);
    return users.map((u) => UserView.fromEntity(u));
  }

  /** Student/lecturer code of a user, or null when the user has no such profile. */
  async getProfileCode(userId: string): Promise<string | null> {
    return this.userService.getProfileCode(userId);
  }

  async findByEmail(email: string): Promise<UserView | null> {
    const user = await this.userService.findByEmail(email);
    return user ? UserView.fromEntity(user) : null;
  }

  async findBySsoId(ssoId: string): Promise<UserView | null> {
    const user = await this.userService.findBySsoId(ssoId);
    return user ? UserView.fromEntity(user) : null;
  }

  async findForPasswordAuth(
    identifier: string,
  ): Promise<{ user: UserView; passwordHash: string | null } | null> {
    return this.userService.findForPasswordAuth(identifier);
  }

  async getUserById(id: string): Promise<UserView> {
    const user = await this.userService.getUserById(id);
    return UserView.fromEntity(user);
  }

  /** Students by user id; ids that are not students are missing from the result. */
  async findStudentsByIds(ids: string[]): Promise<StudentSummary[]> {
    return this.userService.findStudentsByIds(ids);
  }

  async findStudentsByCodes(codes: string[]): Promise<StudentSummary[]> {
    return this.userService.findStudentsByCodes(codes);
  }

  async findStudentsByEmails(emails: string[]): Promise<StudentSummary[]> {
    return this.userService.findStudentsByEmails(emails);
  }

  /** Students that can still join a class: active account and status STUDYING. */
  async searchEnrollableStudents(
    search: string | undefined,
    limit: number,
  ): Promise<StudentSummary[]> {
    return this.userService.searchEnrollableStudents(search, limit);
  }

  /**
   * First Google login of an account an admin created in advance: binds the Google identity and keeps
   * the role. Returns null when the account is already linked to a Google account.
   */
  async claimProvisionedAccount(
    id: string,
    account: GoogleAccountData,
  ): Promise<UserView | null> {
    const user = await this.userService.claimProvisionedAccount(id, account);
    return user ? UserView.fromEntity(user) : null;
  }
}
