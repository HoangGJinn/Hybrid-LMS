import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { UserFacade } from '../facades/user.facade.js';
import { UserView } from '../types/user-view.type.js';
import { Role } from '../../../common/enums/role.enum.js';

/** Handles user-related HTTP requests. */
@Controller('users')
@Auth(Role.ADMIN)
export class UserController {
  constructor(private readonly userFacade: UserFacade) {}

  /** Lists users, optionally filtered by role (e.g. LECTURER for admin class creation). */
  @Get()
  async getUsers(@Query('role') role?: Role): Promise<UserView[]> {
    return this.userFacade.findUsers(role);
  }
}

