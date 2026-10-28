import { Injectable, UnauthorizedException, Logger, HttpException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';

export interface GoogleUserProfile {
  readonly googleId: string;
  readonly email: string;
  readonly fullName: string;
  readonly avatarUrl: string | null;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async verifyToken(idToken: string): Promise<GoogleUserProfile> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) {
        this.logger.warn(
          `Failed Google login: Invalid token payload received.`,
        );
        throw new UnauthorizedException('Invalid Google token');
      }
      // Accounts are matched by email, so an unverified address must never be accepted.
      if (payload.email_verified !== true) {
        this.logger.warn(`Failed Google login: email is not verified.`);
        throw new UnauthorizedException('Google email is not verified');
      }
      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        fullName: payload.name ?? payload.email,
        avatarUrl: payload.picture ?? null,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Google token verification failed`, error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}
