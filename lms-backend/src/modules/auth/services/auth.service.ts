import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { UserFacade } from '../../user/facades/user.facade.js';
import { UserView } from '../../user/types/user-view.type.js';
import { AuthSession } from '../types/auth-session.type.js';
import { SessionUser } from '../types/session-user.type.js';
import { TokenService } from './token.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { GoogleAuthService, GoogleUserProfile } from './google-auth.service.js';
import { LoginDto } from '../dto/login.dto.js';
import { Role } from '../../../common/enums/role.enum.js';

const GOOGLE_PROVIDER = 'GOOGLE';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userFacade: UserFacade,
    private readonly tokenService: TokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly configService: ConfigService,
  ) {}

  /** Lifetime of the refresh cookie in milliseconds. */
  getRefreshTtlMs(): number {
    return this.refreshTokenService.getTtlMs();
  }

  async loginWithGoogle(idToken: string): Promise<AuthSession> {
    this.logger.log(`Attempting Google login...`);
    const googleUser = await this.googleAuthService.verifyToken(idToken);
    const user = await this.findOrCreateGoogleUser(googleUser);
    if (!user.isActive) {
      // Checked before any token is issued; refresh() and JwtStrategy apply the same rule later on.
      this.logger.warn(`Login refused, account is disabled: ${user.email}`);
      throw new UnauthorizedException('Account is disabled');
    }
    return this.startSession(
      user,
      await this.refreshTokenService.issue(user.id),
    );
  }

  async loginWithCredentials(dto: LoginDto): Promise<AuthSession> {
    this.logger.log(`Attempting password login for: ${dto.username}`);
    const account = await this.userFacade.findForPasswordAuth(dto.username);
    if (!account || !account.passwordHash) {
      this.logger.warn(
        `Login failed: user not found or has no password set: ${dto.username}`,
      );
      throw new UnauthorizedException('Invalid username or password');
    }
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      account.passwordHash,
    );
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: incorrect password for: ${dto.username}`);
      throw new UnauthorizedException('Invalid username or password');
    }
    if (!account.user.isActive) {
      this.logger.warn(
        `Login refused, account is disabled: ${account.user.email}`,
      );
      throw new UnauthorizedException('Account is disabled');
    }
    return this.startSession(
      account.user,
      await this.refreshTokenService.issue(account.user.id),
    );
  }

  /** Swaps a valid refresh token for a new access token and a rotated refresh token. */
  async refresh(rawRefreshToken: string): Promise<AuthSession> {
    const { userId, refreshToken } =
      await this.refreshTokenService.rotate(rawRefreshToken);
    const user = await this.userFacade.getUserById(userId);
    if (!user.isActive) {
      await this.refreshTokenService.revokeFamilyOf(refreshToken);
      throw new UnauthorizedException('Account is disabled');
    }
    return this.startSession(user, refreshToken);
  }

  /** Revokes the device's refresh-token family. Safe to call without a token or with an expired access token. */
  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken)
      await this.refreshTokenService.revokeFamilyOf(rawRefreshToken);
    this.logger.log('A user logged out.');
  }

  async getMe(userId: string): Promise<SessionUser> {
    return this.toSessionUser(await this.userFacade.getUserById(userId));
  }

  /**
   * Find-or-Create flow:
   * 1. Find User by ssoId (googleId) → Returning user → return immediately
   * 2. Find User by email → an account an admin pre-provisioned (e.g. role LECTURER, no Google identity yet)
   *    → bind this Google account to that record and keep its role. If the record is already bound to a
   *    different Google account, refuse: never overwrite another person's identity.
   * 3. Not found → First time login of someone unknown → create new User (ADMIN if listed in ADMIN_EMAILS, else STUDENT)
   */
  private async findOrCreateGoogleUser(
    profile: GoogleUserProfile,
  ): Promise<UserView> {
    const existingBySsoId = await this.userFacade.findBySsoId(profile.googleId);
    if (existingBySsoId) {
      this.logger.log(`Returning user found by ssoId: ${profile.email}`);
      return existingBySsoId;
    }
    const existingByEmail = await this.userFacade.findByEmail(profile.email);
    if (existingByEmail) {
      if (!existingByEmail.isActive) {
        // Refuse before binding the Google identity: a disabled account must not be touched by a login.
        this.logger.warn(
          `Login refused, account is disabled: ${profile.email}`,
        );
        throw new UnauthorizedException('Account is disabled');
      }
      this.logger.log(
        `Pre-provisioned account found by email, linking Google SSO (role ${existingByEmail.role}): ${profile.email}`,
      );
      const claimed = await this.userFacade.claimProvisionedAccount(
        existingByEmail.id,
        {
          ssoId: profile.googleId,
          ssoProvider: GOOGLE_PROVIDER,
          avatarUrl: profile.avatarUrl,
          fullName: profile.fullName,
        },
      );
      if (!claimed) {
        this.logger.warn(
          `Login refused, ${profile.email} is linked to another Google account`,
        );
        throw new UnauthorizedException(
          'This email is linked to a different Google account',
        );
      }
      return claimed;
    }

    // First time login: determine role based on configured ADMIN_EMAILS
    const email = profile.email.toLowerCase().trim();
    const adminEmails = (this.configService.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const role = adminEmails.includes(email) ? Role.ADMIN : Role.STUDENT;

    this.logger.log(
      `New user — creating account for: ${profile.email} with role: ${role}`,
    );
    return this.userFacade.createUser({
      email: profile.email,
      fullName: profile.fullName,
      ssoId: profile.googleId,
      ssoProvider: GOOGLE_PROVIDER,
      avatarUrl: profile.avatarUrl ?? undefined,
      role,
    });
  }

  private async startSession(
    user: UserView,
    refreshToken: string,
  ): Promise<AuthSession> {
    this.logger.log(
      `User ${user.email} authenticated successfully. Role: ${user.role}`,
    );
    return {
      accessToken: this.tokenService.generateAccessToken(user),
      refreshToken,
      user: await this.toSessionUser(user),
    };
  }

  private async toSessionUser(user: UserView): Promise<SessionUser> {
    return { ...user, code: await this.userFacade.getProfileCode(user.id) };
  }
}
