import { Role } from '../../../common/enums/role.enum.js'

export interface JwtPayload {
  readonly sub: string
  readonly email: string
  readonly role: Role
}
