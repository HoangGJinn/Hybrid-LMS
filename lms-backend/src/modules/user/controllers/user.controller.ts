import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js'
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js'
import { User } from '../entities/user.entity.js'

/** Handles user-related HTTP requests. */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  /** Returns the profile of the currently authenticated user. */
  @Get('me')
  getMe(@CurrentUser() user: User): User {
    return user
  }
}
