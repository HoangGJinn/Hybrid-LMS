import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { MonitoringService } from '../services/monitoring.service.js';
import type { SystemMonitoringOverview } from '../types/monitoring-overview.type.js';

@ApiTags('Admin Monitoring')
@Controller('admin/monitoring')
@Auth(Role.ADMIN)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get real-time host/container resources, dependencies, and HTTP load metrics',
  })
  getOverview(
    @Query('refresh') refresh?: string,
  ): Promise<SystemMonitoringOverview> {
    return this.monitoringService.getOverview(refresh === 'true');
  }
}
