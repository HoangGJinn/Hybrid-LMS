import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { GoogleAuthDto } from '../dto/google-auth.dto.js';
import { REFRESH_COOKIE_NAME } from '../constants/refresh-cookie-name.constant.js';
import {
  AuthTokenResponse,
  LoginResponse,
} from '../types/auth-token-response.type.js';
import { SessionUser } from '../types/session-user.type.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { Auth } from '../../../common/decorators/auth.decorator.js';

/** The refresh cookie is only sent to the auth routes, never to the rest of the API. */
const REFRESH_COOKIE_PATH = '/api/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Google login: returns the access token in the body and sets the refresh token as an httpOnly cookie. */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async loginWithGoogle(
    @Body() dto: GoogleAuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const session = await this.authService.loginWithGoogle(dto.idToken);
    this.setRefreshCookie(res, session.refreshToken);
    return { accessToken: session.accessToken, user: session.user };
  }

  /** Called by the frontend when the access token expired (or is missing after a page reload). Rotates the refresh token. */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokenResponse> {
    this.assertTrustedOrigin(req);
    const rawToken = this.readRefreshCookie(req);
    if (!rawToken) throw new UnauthorizedException('Missing refresh token');
    try {
      const session = await this.authService.refresh(rawToken);
      this.setRefreshCookie(res, session.refreshToken);
      return { accessToken: session.accessToken };
    } catch (error) {
      this.clearRefreshCookie(res);
      throw error;
    }
  }

  @Get('me')
  @Auth()
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<SessionUser> {
    return this.authService.getMe(user.id);
  }

  /** Not guarded on purpose: logout must work even when the access token has already expired. */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    this.assertTrustedOrigin(req);
    await this.authService.logout(this.readRefreshCookie(req));
    this.clearRefreshCookie(res);
    return { message: 'Logged out successfully' };
  }

  private readRefreshCookie(req: Request): string | undefined {
    const value: unknown = req.cookies?.[REFRESH_COOKIE_NAME];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      ...this.getCookieOptions(),
      maxAge: this.authService.getRefreshTtlMs(),
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, this.getCookieOptions());
  }

  /** `none` (cross-site frontend) requires `Secure`, so it is forced on. */
  private getCookieOptions(): CookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    const sameSite = this.getSameSite();
    return {
      httpOnly: true,
      secure: isProduction || sameSite === 'none',
      sameSite,
      path: REFRESH_COOKIE_PATH,
    };
  }

  private getSameSite(): 'strict' | 'lax' | 'none' {
    const configured = process.env.REFRESH_COOKIE_SAME_SITE;
    if (
      configured === 'strict' ||
      configured === 'lax' ||
      configured === 'none'
    )
      return configured;
    return process.env.NODE_ENV === 'production' ? 'strict' : 'lax';
  }

  /** With `SameSite=none` the browser attaches the cookie to cross-site requests, so only our own frontend may call refresh/logout. */
  private assertTrustedOrigin(req: Request): void {
    if (this.getSameSite() !== 'none') return;
    const origin = req.headers.origin;
    const allowed = [
      process.env.FRONTEND_URL?.replace(/\/$/, ''),
      process.env.ADMIN_URL?.replace(/\/$/, ''),
    ].filter(Boolean);
    if (origin && !allowed.includes(origin))
      throw new ForbiddenException('Untrusted origin');
  }
}
