import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UserFacade } from '../../user/facades/user.facade.js'
import { JwtPayload } from '../../../common/types/jwt-payload.type.js'
import { User } from '../../user/entities/user.entity.js'

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

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userFacade.getUserById(payload.sub)
    if (!user || !user.isActive) throw new UnauthorizedException()
    return user
  }
}
