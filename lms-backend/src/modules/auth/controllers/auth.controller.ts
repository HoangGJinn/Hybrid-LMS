import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { AuthService, AuthTokenResponse } from '../services/auth.service.js'
import { GoogleAuthDto } from '../dto/google-auth.dto.js'
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js'
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js'
import { User } from '../../user/entities/user.entity.js'

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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: User): User {
    return user
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: User): { message: string } {
    this.authService.logout(user)
    return { message: 'Logged out successfully' }
  }
}
