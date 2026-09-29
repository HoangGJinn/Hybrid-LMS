import { Injectable, Logger } from '@nestjs/common'
import { UserFacade } from '../../user/facades/user.facade.js'
import { UserView } from '../../user/types/user-view.type.js'
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import { TokenService } from './token.service.js'
import { GoogleAuthService, GoogleUserProfile } from './google-auth.service.js'

export interface AuthTokenResponse {
  readonly accessToken: string
  readonly user: UserView
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly userFacade: UserFacade,
    private readonly tokenService: TokenService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  async loginWithGoogle(idToken: string): Promise<AuthTokenResponse> {
    this.logger.log(`Attempting Google login...`)
    const googleUser = await this.googleAuthService.verifyToken(idToken)
    const user = await this.findOrCreateGoogleUser(googleUser)
    return this.buildTokenResponse(user)
  }

  logout(user: AuthenticatedUser): void {
    // Stateless JWT: real invalidation happens client-side (remove token from storage)
    // Future: add token blacklist via Redis for extra security
    this.logger.log(`User ${user.email} (ID: ${user.id}) logged out.`)
  }

  /**
   * Find-or-Create flow:
   * 1. Find User by ssoId (googleId) → Returning user → return immediately
   * 2. Find User by email → Existing account without Google SSO linked → link & return
   * 3. Not found → First time login → create new User (default role STUDENT)
   */
  private async findOrCreateGoogleUser(profile: GoogleUserProfile): Promise<UserView> {
    // Step 1: Lookup by ssoId (most common path for returning users)
    const existingBySsoId = await this.userFacade.findBySsoId(profile.googleId)
    if (existingBySsoId) {
      this.logger.log(`Returning user found by ssoId: ${profile.email}`)
      return existingBySsoId
    }

    // Step 2: Lookup by email (e.g., account pre-created by admin)
    const existingByEmail = await this.userFacade.findByEmail(profile.email)
    if (existingByEmail) {
      this.logger.log(`Existing account found by email, linking Google SSO: ${profile.email}`)
      return this.userFacade.linkSso(existingByEmail.id, {
        ssoId: profile.googleId,
        ssoProvider: 'GOOGLE',
        avatarUrl: profile.avatarUrl,
      })
    }

    // Step 3: Brand new user — create User + Student profile in one transaction
    this.logger.log(`New user — creating account for: ${profile.email}`)
    return this.userFacade.createUser({
      email: profile.email,
      fullName: profile.fullName,
      ssoId: profile.googleId,
      ssoProvider: 'GOOGLE',
      avatarUrl: profile.avatarUrl ?? undefined,
    })
  }

  private buildTokenResponse(user: UserView): AuthTokenResponse {
    this.logger.log(`User ${user.email} authenticated successfully. Role: ${user.role}`)
    return {
      accessToken: this.tokenService.generateAccessToken(user),
      user,
    }
  }
}
