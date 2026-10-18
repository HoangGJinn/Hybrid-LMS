import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { UserFacade } from '../facades/user.facade.js';
import { UserView } from '../types/user-view.type.js';
import { Role } from '../../../common/enums/role.enum.js';

/** Handles user-related HTTP requests. */
@Controller('users')
@Auth()
export class UserController {
  constructor(private readonly userFacade: UserFacade) {}

  /** Returns the profile of the currently authenticated user. */
  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  /** Lists users, optionally filtered by role (e.g. LECTURER for admin class creation). */
  @Get()
  @Auth(Role.ADMIN)
  async getUsers(@Query('role') role?: Role): Promise<UserView[]> {
    return this.userFacade.findUsers(role);
  }
}
