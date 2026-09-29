import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UserFacade } from '../../user/facades/user.facade.js'
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import { JwtPayload } from '../types/jwt-payload.type.js'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly userFacade: UserFacade, // Use Facade, not Service!
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') ?? '',
    })
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userFacade.getUserById(payload.sub)
    if (!user || !user.isActive) throw new UnauthorizedException()
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    }
  }
}
