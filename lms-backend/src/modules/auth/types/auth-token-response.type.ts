import { SessionUser } from './session-user.type.js'

/** Response body of login/refresh. */
export interface AuthTokenResponse {
  readonly accessToken: string
  readonly user: SessionUser
}
