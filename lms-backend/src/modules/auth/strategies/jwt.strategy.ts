import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserFacade } from '../../user/facades/user.facade.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { JwtPayload } from '../types/jwt-payload.type.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly userFacade: UserFacade, // Use Facade, not Service!
  ) {
    super({
      // The access token lives in the frontend's memory and arrives only as a Bearer header (never as a cookie).
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') ?? '',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // A token of an account that no longer exists is an authentication failure (401), not a missing resource (404).
    const user = await this.userFacade
      .getUserById(payload.sub)
      .catch((error: unknown) => {
        if (error instanceof NotFoundException) return null;
        throw error;
      });
    if (!user?.isActive) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
