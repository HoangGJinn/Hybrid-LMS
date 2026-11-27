import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { MasteryTrackingService } from '../services/mastery-tracking.service.js';

/** Data of the student's Knowledge Mastery tab. */
@Controller('mastery')
export class MasteryController {
  constructor(private readonly service: MasteryTrackingService) {}

  /** GET /mastery/kc/me: ENAS mastery of every KC the student answered, with the next review. */
  @Get('kc/me')
  @Auth(Role.STUDENT)
  kc(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listKc(user.id);
  }

  /** GET /mastery/competency/me: ability per subject. */
  @Get('competency/me')
  @Auth(Role.STUDENT)
  competency(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listCompetency(user.id);
  }

  /** POST /mastery/me/recompute: recomputes the tables from the whole answer history. */
  @Post('me/recompute')
  @Auth(Role.STUDENT)
  @HttpCode(HttpStatus.OK)
  async recompute(@CurrentUser() user: AuthenticatedUser) {
    await this.service.recompute(user.id);
    return this.service.listKc(user.id);
  }
}
