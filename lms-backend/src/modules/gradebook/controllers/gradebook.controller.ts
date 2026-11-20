import { Controller, Get, Param, ParseUUIDPipe, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
// Chỉnh đường dẫn import cho khớp repo thật
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { sendXlsx } from '../../../shared/excel/workbook.util.js';
import { GradebookQueryDto } from '../dto/gradebook-query.dto.js';
import { GradebookService } from '../services/gradebook.service.js';
import type { GradebookView } from '../types/gradebook.types.js';

@Controller('classes/:classId/gradebook')
export class GradebookController {
  constructor(private readonly gradebookService: GradebookService) {}

  @Get()
  @Auth(Role.LECTURER, Role.ADMIN)
  async getGradebook(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: GradebookQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GradebookView> {
    return this.gradebookService.getGradebook(classId, query, user);
  }

  /**
   * The full gradebook (every student and column, ignoring paging) as an Excel file. Declared as its
   * own route and written to `response` directly so the JSON envelope does not wrap the file.
   */
  @Get('export')
  @Auth(Role.LECTURER, Role.ADMIN)
  async exportGradebook(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.gradebookService.exportGradebook(classId, user);
    sendXlsx(response, file);
  }
}