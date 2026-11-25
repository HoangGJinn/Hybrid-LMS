import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { sendXlsx } from '../../../shared/excel/workbook.util.js';
import { ExportClassRostersQueryDto } from '../dto/export-class-rosters.dto.js';
import { AcademicExportService } from '../services/academic-export.service.js';

/** Excel downloads of the admin "Import / Export" page. */
@Controller('exports')
@Auth(Role.ADMIN)
export class AcademicExportController {
  constructor(private readonly exportService: AcademicExportService) {}

  /** Classes and their students in the import layout. Written to `response` so no JSON envelope wraps the file. */
  @Get('class-rosters')
  async exportClassRosters(
    @Query() query: ExportClassRostersQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    sendXlsx(response, await this.exportService.exportClassRosters(query));
  }

  /** Subject, semester and lecturer codes for filling in the import templates. */
  @Get('reference-codes')
  async exportReferenceCodes(@Res() response: Response): Promise<void> {
    sendXlsx(response, await this.exportService.exportReferenceCodes());
  }
}
