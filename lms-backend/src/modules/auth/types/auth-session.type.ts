import { SessionUser } from './session-user.type.js'

/** Internal result of login/refresh. The refresh token goes into a cookie and must never reach the response body. */
export interface AuthSession {
  readonly accessToken: string
  readonly refreshToken: string
  readonly user: SessionUser
}
