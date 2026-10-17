import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { UserFacade } from '../../user/facades/user.facade.js'
import { UserView } from '../../user/types/user-view.type.js'
import { AuthSession } from '../types/auth-session.type.js'
import { SessionUser } from '../types/session-user.type.js'
import { TokenService } from './token.service.js'
import { RefreshTokenService } from './refresh-token.service.js'
import { GoogleAuthService, GoogleUserProfile } from './google-auth.service.js'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly userFacade: UserFacade,
    private readonly tokenService: TokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  /** Lifetime of the refresh cookie in milliseconds. */
  getRefreshTtlMs(): number {
    return this.refreshTokenService.getTtlMs()
  }

  async loginWithGoogle(idToken: string): Promise<AuthSession> {
    this.logger.log(`Attempting Google login...`)
    const googleUser = await this.googleAuthService.verifyToken(idToken)
    const user = await this.findOrCreateGoogleUser(googleUser)
    return this.startSession(user, await this.refreshTokenService.issue(user.id))
  }

  /** Swaps a valid refresh token for a new access token and a rotated refresh token. */
  async refresh(rawRefreshToken: string): Promise<AuthSession> {
    const { userId, refreshToken } = await this.refreshTokenService.rotate(rawRefreshToken)
    const user = await this.userFacade.getUserById(userId)
    if (!user.isActive) {
      await this.refreshTokenService.revokeFamilyOf(refreshToken)
      throw new UnauthorizedException('Account is disabled')
    }
    return this.startSession(user, refreshToken)
  }

  /** Revokes the device's refresh-token family. Safe to call without a token or with an expired access token. */
  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) await this.refreshTokenService.revokeFamilyOf(rawRefreshToken)
    this.logger.log('A user logged out.')
  }

  async getMe(userId: string): Promise<SessionUser> {
    return this.toSessionUser(await this.userFacade.getUserById(userId))
  }

  /**
   * Find-or-Create flow:
   * 1. Find User by ssoId (googleId) → Returning user → return immediately
   * 2. Find User by email → Existing account without Google SSO linked → link & return
   * 3. Not found → First time login → create new User (default role STUDENT)
   */
  private async findOrCreateGoogleUser(profile: GoogleUserProfile): Promise<UserView> {
    const existingBySsoId = await this.userFacade.findBySsoId(profile.googleId)
    if (existingBySsoId) {
      this.logger.log(`Returning user found by ssoId: ${profile.email}`)
      return existingBySsoId
    }
    const existingByEmail = await this.userFacade.findByEmail(profile.email)
    if (existingByEmail) {
      this.logger.log(`Existing account found by email, linking Google SSO: ${profile.email}`)
      return this.userFacade.linkSso(existingByEmail.id, {
        ssoId: profile.googleId,
        ssoProvider: 'GOOGLE',
        avatarUrl: profile.avatarUrl,
      })
    }
    this.logger.log(`New user — creating account for: ${profile.email}`)
    return this.userFacade.createUser({
      email: profile.email,
      fullName: profile.fullName,
      ssoId: profile.googleId,
      ssoProvider: 'GOOGLE',
      avatarUrl: profile.avatarUrl ?? undefined,
    })
  }

  private async startSession(user: UserView, refreshToken: string): Promise<AuthSession> {
    this.logger.log(`User ${user.email} authenticated successfully. Role: ${user.role}`)
    return {
      accessToken: this.tokenService.generateAccessToken(user),
      refreshToken,
      user: await this.toSessionUser(user),
    }
  }

  private async toSessionUser(user: UserView): Promise<SessionUser> {
    return { ...user, code: await this.userFacade.getProfileCode(user.id) }
  }
}
