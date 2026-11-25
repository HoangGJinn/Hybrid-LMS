import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AdminStatsService } from '../services/admin-stats.service.js';
import type { AdminDashboardOverview } from '../types/admin-dashboard-overview.type.js';

@Controller('admin/stats')
@Auth(Role.ADMIN)
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  /** `days` selects the trend window (7, 14 or 30); other values fall back to 14. */
  @Get('overview')
  getOverview(@Query('days') days?: string): Promise<AdminDashboardOverview> {
    const trimmed = days?.trim();
    const parsed =
      trimmed && /^\d+$/.test(trimmed) ? Number(trimmed) : undefined;
    return this.adminStatsService.getOverview(new Date(), parsed);
  }
}
