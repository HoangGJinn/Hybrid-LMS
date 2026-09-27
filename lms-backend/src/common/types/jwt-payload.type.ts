import { Role } from '../../modules/user/entities/user.entity.js'

export interface JwtPayload {
  readonly sub: string
  readonly email: string
  readonly role: Role
}
