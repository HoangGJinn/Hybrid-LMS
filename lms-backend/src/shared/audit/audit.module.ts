import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogController } from './controllers/audit-log.controller.js';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditFacade } from './facades/audit.facade.js';
import { AuditLogRepository } from './repositories/audit-log.repository.js';
import { AuditLogService } from './services/audit-log.service.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogController],
  providers: [AuditLogRepository, AuditLogService, AuditFacade],
  exports: [AuditFacade],
})
export class AuditModule {}
