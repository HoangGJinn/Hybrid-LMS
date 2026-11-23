import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import type { PaginatedResult } from '../../../common/types/paginated-result.type.js';
import { sendXlsx } from '../../excel/workbook.util.js';
import { ListAuditLogsQueryDto } from '../dto/list-audit-logs-query.dto.js';
import { AuditLogService } from '../services/audit-log.service.js';
import type { AuditLogView } from '../types/audit-log-view.type.js';

@Controller('audit-logs')
@Auth(Role.ADMIN)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  list(
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<PaginatedResult<AuditLogView>> {
    return this.auditLogService.list(query);
  }

  @Get('recent')
  getRecent(
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ): Promise<AuditLogView[]> {
    return this.auditLogService.getRecent(limit);
  }

  @Get('export')
  async exportExcel(
    @Query() query: ListAuditLogsQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    sendXlsx(response, await this.auditLogService.exportExcel(query));
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<AuditLogView> {
    return this.auditLogService.getById(id);
  }
}
