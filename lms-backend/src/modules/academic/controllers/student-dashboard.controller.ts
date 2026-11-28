import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { StudentDashboardService } from '../services/student-dashboard.service.js';
import type { StudentDashboardOverview } from '../types/student-dashboard-overview.type.js';

@Controller('student/dashboard')
@Auth(Role.STUDENT)
export class StudentDashboardController {
  constructor(
    private readonly studentDashboardService: StudentDashboardService,
  ) {}

  /** `days` selects the study activity trend window (7, 14 or 30); other values fall back to 14. */
  @Get('overview')
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days') days?: string,
  ): Promise<StudentDashboardOverview> {
    const trimmed = days?.trim();
    const parsed =
      trimmed && /^\d+$/.test(trimmed) ? Number(trimmed) : undefined;
    return this.studentDashboardService.getOverview(
      user.id,
      new Date(),
      parsed,
    );
  }
}
