import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MonitoringService } from '../services/monitoring.service.js';
import type { PublicHealthCheck } from '../types/monitoring-overview.type.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get()
  @ApiOperation({ summary: 'Public readiness check for Docker and load balancers' })
  check(): Promise<PublicHealthCheck> {
    return this.monitoringService.checkHealth();
  }
}
