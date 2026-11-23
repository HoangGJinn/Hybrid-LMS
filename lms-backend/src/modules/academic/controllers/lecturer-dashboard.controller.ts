import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { LecturerDashboardService } from '../services/lecturer-dashboard.service.js';
import type { LecturerDashboardOverview } from '../types/lecturer-dashboard-overview.type.js';

@Controller('lecturer/dashboard')
@Auth(Role.LECTURER)
export class LecturerDashboardController {
  constructor(
    private readonly lecturerDashboardService: LecturerDashboardService,
  ) {}

  /** `days` selects the submission trend window (7, 14 or 30); other values fall back to 14. */
  @Get('overview')
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days') days?: string,
  ): Promise<LecturerDashboardOverview> {
    const trimmed = days?.trim();
    const parsed =
      trimmed && /^\d+$/.test(trimmed) ? Number(trimmed) : undefined;
    return this.lecturerDashboardService.getOverview(
      user.id,
      new Date(),
      parsed,
    );
  }
}
