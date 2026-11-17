import { Controller, Delete, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { ZaloLinkService } from '../services/zalo-link.service.js';

/** Liên kết tài khoản LMS với Zalo Bot để nhận thông báo. */
@Controller('zalo')
export class ZaloController {
  constructor(private readonly linkService: ZaloLinkService) {}

  @Post('link-code')
  @Auth(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  async createCode(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ code: string; expiresInSeconds: number }> {
    return this.linkService.createCode(user.id);
  }

  @Get('status')
  @Auth(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  async status(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ linked: boolean; linkedAt: Date | null }> {
    return this.linkService.getStatus(user.id);
  }

  @Delete('link')
  @Auth(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlink(@CurrentUser() user: AuthenticatedUser): Promise<void> {

    return this.linkService.unlink(user.id);
  }
}