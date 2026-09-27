import { Injectable, UnauthorizedException, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { OAuth2Client } from 'google-auth-library'
import { ConfigService } from '@nestjs/config'
import { UserFacade } from '../../user/facades/user.facade.js'
import { User, AuthProvider } from '../../user/entities/user.entity.js'
import { JwtPayload } from '../../../common/types/jwt-payload.type.js'

export interface AuthTokenResponse {
  readonly accessToken: string
  readonly user: Omit<User, 'password'>
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly googleClient: OAuth2Client

  constructor(
    private readonly userFacade: UserFacade, // Use Facade, not Service!
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    )
  }

  async loginWithGoogle(idToken: string): Promise<AuthTokenResponse> {
    this.logger.log(`Attempting Google login with token starting with: ${idToken.substring(0, 10)}...`)
    const googleUser = await this.verifyGoogleToken(idToken)
    const user = await this.findOrCreateGoogleUser(googleUser)
    return this.buildTokenResponse(user)
  }

  logout(user: User): void {
    // In a stateless JWT setup, real invalidation happens on the client side (removing the token).
    // However, this backend endpoint is crucial for:
    // 1. Audit logging.
    // 2. Future extension (e.g., adding token to a Redis blacklist).
    // 3. Clearing HttpOnly cookies if we switch from Authorization headers.
    this.logger.log(`User ${user.email} (ID: ${user.id}) logged out securely.`)
  }

  private async verifyGoogleToken(
    idToken: string,
  ): Promise<{ googleId: string; email: string; fullName: string }> {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
    })
    const payload = ticket.getPayload()
    if (!payload?.sub || !payload.email) {
      this.logger.warn(`Failed Google login: Invalid token payload received.`)
      throw new UnauthorizedException('Invalid Google token')
    }
    return {
      googleId: payload.sub,
      email: payload.email,
      fullName: payload.name ?? payload.email,
    }
  }

  private async findOrCreateGoogleUser(profile: {
    googleId: string
    email: string
    fullName: string
  }): Promise<User> {
    const existingByGoogle = await this.userFacade.findByGoogleId(profile.googleId)
    if (existingByGoogle) return existingByGoogle
    const existingByEmail = await this.userFacade.findByEmail(profile.email)
    if (existingByEmail) return existingByEmail
    const username = this.generateUsername(profile.email)
    return this.userFacade.createUser({
      username,
      email: profile.email,
      fullName: profile.fullName,
      googleId: profile.googleId,
      authProvider: AuthProvider.GOOGLE,
    })
  }

  private generateUsername(email: string): string {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '')
    const suffix = Date.now().toString(36).slice(-4)  // time-based → collision-resistant
    return `${base}_${suffix}`
  }

  private buildTokenResponse(user: User): AuthTokenResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role }
    // Explicitly strip sensitive fields before returning to the client
    const { password: _pw, ...safeUser } = user as User & { password?: string }
    this.logger.log(`User ${user.email} logged in successfully!`)
    return {
      accessToken: this.jwtService.sign(payload),
      user: safeUser as Omit<User, 'password'>,
    }
  }
}
