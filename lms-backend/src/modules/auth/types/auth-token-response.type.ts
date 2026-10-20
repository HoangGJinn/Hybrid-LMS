import { SessionUser } from './session-user.type.js';

/** Response body of login (/google). Sets up the session with user profile and access token. */
export interface LoginResponse {
  readonly accessToken: string;
  readonly user: SessionUser;
}

/** Response body of token refresh (/refresh). Extends the token lifetime without returning user profile. */
export interface AuthTokenResponse {
  readonly accessToken: string;
}
