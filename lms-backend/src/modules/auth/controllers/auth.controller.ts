import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { AuthService, AuthTokenResponse } from '../services/auth.service.js'
import { GoogleAuthDto } from '../dto/google-auth.dto.js'
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js'
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js'
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('test')
  test(): string {
    return 'Auth module OK'
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async loginWithGoogle(@Body() dto: GoogleAuthDto): Promise<AuthTokenResponse> {
    return this.authService.loginWithGoogle(dto.idToken)
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: AuthenticatedUser): { message: string } {
    this.authService.logout(user)
    return { message: 'Logged out successfully' }
  }
}
