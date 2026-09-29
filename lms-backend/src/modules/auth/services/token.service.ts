import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { JwtPayload } from '../types/jwt-payload.type.js'
import { UserView } from '../../user/types/user-view.type.js'

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  generateAccessToken(user: UserView): string {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role }
    return this.jwtService.sign(payload)
  }
}
