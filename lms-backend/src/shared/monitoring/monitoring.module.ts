import { Global, Module } from '@nestjs/common';
import { FileModule } from '../file/file.module.js';
import { HealthController } from './controllers/health.controller.js';
import { MonitoringController } from './controllers/monitoring.controller.js';
import { MonitoringRepository } from './repositories/monitoring.repository.js';
import { ContainerMetricsCollector } from './services/container-metrics.collector.js';
import { HttpMetricsStore } from './services/http-metrics.store.js';
import { MonitoringService } from './services/monitoring.service.js';

@Global()
@Module({
  imports: [FileModule],
  controllers: [HealthController, MonitoringController],
  providers: [
    HttpMetricsStore,
    ContainerMetricsCollector,
    MonitoringRepository,
    MonitoringService,
  ],
  exports: [HttpMetricsStore],
})
export class MonitoringModule {}
