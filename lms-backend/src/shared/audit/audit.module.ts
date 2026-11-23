import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminStatsController } from './controllers/admin-stats.controller.js';
import { AuditLogController } from './controllers/audit-log.controller.js';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditFacade } from './facades/audit.facade.js';
import { AdminStatsRepository } from './repositories/admin-stats.repository.js';
import { AuditLogRepository } from './repositories/audit-log.repository.js';
import { AdminStatsService } from './services/admin-stats.service.js';
import { AuditLogService } from './services/audit-log.service.js';
import { PresenceService } from './services/presence.service.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogController, AdminStatsController],
  providers: [
    AuditLogRepository,
    AdminStatsRepository,
    PresenceService,
    AuditLogService,
    AdminStatsService,
    AuditFacade,
  ],
  exports: [AuditFacade, PresenceService],
})
export class AuditModule {}
